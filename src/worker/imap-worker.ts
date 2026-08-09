/**
 * IMAP worker: polls each account every 7 minutes (Contabo timer, no Redis/BullMQ).
 * - Checks INBOX for new warmup mail → marks OPENED, optionally replies
 * - Checks [Gmail]/Spam → rescues warmup mail (moves to Inbox, marks not-spam)
 */
import { ImapFlow, FetchMessageObject } from "imapflow";
import { PrismaClient, Account } from "@prisma/client";
import { decrypt } from "../lib/crypto";
import { generateReplyContent } from "../lib/ai-content";
import { personalizeReplyContent, resolveDisplayName } from "../lib/personalize";
import logger from "./logger";
import nodemailer from "nodemailer";
import type { IntervalWorkerHandle } from "./smtp-worker";

const prisma = new PrismaClient();
const IMAP_INTERVAL_MS = 7 * 60 * 1000;

// Track which accounts we're currently polling (prevent concurrent polls per account)
const activePollSet = new Set<string>();

async function connectImap(account: Account): Promise<ImapFlow | null> {
  const appPassword = decrypt(account.appPassword);
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: {
      user: account.email,
      pass: appPassword,
    },
    logger: false,
    emitLogs: false,
    connectionTimeout: 60_000,
    greetingTimeout: 30_000,
    socketTimeout: 90_000,
  });

  // Prevent unhandled socket timeout from crashing the process / flooding stderr
  client.on("error", (err: Error) => {
    logger.warn(
      { email: account.email, err: err.message, code: (err as { code?: string }).code },
      "IMAP client error (non-fatal)"
    );
  });

  try {
    await client.connect();
    return client;
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    logger.error(
      { accountId: account.id, email: account.email, err: error.message, code: error.code },
      "IMAP connection failed"
    );

    const isAuthError =
      error.message?.includes("AUTHENTICATIONFAILED") ||
      error.message?.includes("Invalid credentials") ||
      error.message?.includes("535");

    if (isAuthError) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          status: "ERROR",
          dailyTargetVolume: 0,
          lastError: `IMAP auth failed: ${error.message}`,
        },
      });
    }
    return null;
  }
}

async function checkInboxForOpens(
  client: ImapFlow,
  account: Account,
  config: { replyProbability: number; aiProvider: string }
): Promise<void> {
  const lock = await client.getMailboxLock("INBOX");
  const matched: Array<{
    eventId: string;
    uid: number;
    messageId: string | null;
  }> = [];

  try {
    // Search for unread messages from warmup pool senders
    const sentEvents = await prisma.warmupEvent.findMany({
      where: {
        receiverId: account.id,
        status: "SENT",
        messageId: { not: null },
      },
      include: { sender: true },
      take: 50,
    });

    if (sentEvents.length === 0) return;

    for await (const msg of client.fetch(
      { seen: false },
      { uid: true, envelope: true, flags: true }
    ) as AsyncIterable<FetchMessageObject>) {
      const msgId = msg.envelope?.messageId;
      if (!msgId) continue;

      const matchedEvent = sentEvents.find(
        (e) =>
          e.messageId === msgId ||
          (msg.envelope?.from?.[0]?.address &&
            e.sender.email === msg.envelope.from[0].address)
      );

      if (!matchedEvent) continue;

      // Mark seen immediately — do NOT hold the IMAP socket for human-like delays
      await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"]);
      matched.push({
        eventId: matchedEvent.id,
        uid: msg.uid,
        messageId: matchedEvent.messageId,
      });
    }
  } finally {
    lock.release();
  }

  // Schedule open/reply AFTER releasing the mailbox (avoids ETIMEOUT on idle socket)
  for (const m of matched) {
    const event = await prisma.warmupEvent.findUnique({
      where: { id: m.eventId },
      include: { sender: true },
    });
    if (!event || event.status !== "SENT") continue;

    const readDelay = 60_000 + Math.random() * 9 * 60_000; // 1–10 min
    setTimeout(async () => {
      try {
        await prisma.warmupEvent.update({
          where: { id: event.id },
          data: { status: "OPENED", openedAt: new Date() },
        });
        logger.info(
          { eventId: event.id, receiverEmail: account.email },
          "Warmup email marked as OPENED"
        );

        if (Math.random() < config.replyProbability) {
          const replyDelay = 2 * 60_000 + Math.random() * 43 * 60_000;
          setTimeout(async () => {
            await sendReply(event, account, config.aiProvider);
          }, replyDelay);
        }
      } catch (err) {
        logger.error({ err, eventId: event.id }, "Failed delayed OPENED update");
      }
    }, readDelay);
  }
}

async function sendReply(
  originalEvent: { id: string; subject: string; bodyPreview: string; messageId: string | null; sender: Account },
  replierAccount: Account,
  aiProvider: string
): Promise<void> {
  try {
    const replyerName = resolveDisplayName(
      replierAccount.displayName,
      replierAccount.email
    );
    const originalSenderName = resolveDisplayName(
      originalEvent.sender.displayName,
      originalEvent.sender.email
    );

    const replyContent = await generateReplyContent(
      originalEvent.subject,
      originalEvent.bodyPreview,
      aiProvider,
      replyerName
    );

    const personalized = personalizeReplyContent(
      replyContent.subject,
      replyContent.body,
      replyerName,
      originalSenderName
    );

    const appPassword = decrypt(replierAccount.appPassword);
    const transporter = nodemailer.createTransport({
      host: replierAccount.smtpHost,
      port: replierAccount.smtpPort,
      secure: replierAccount.smtpPort === 465,
      auth: {
        user: replierAccount.email,
        pass: appPassword,
      },
    });

    const messageId = `<reply-${originalEvent.id}-${Date.now()}@warmup.local>`;

    await transporter.sendMail({
      from: `"${replyerName}" <${replierAccount.email}>`,
      to: originalEvent.sender.email,
      subject: personalized.subject,
      text: personalized.body,
      messageId,
      inReplyTo: originalEvent.messageId || undefined,
      references: originalEvent.messageId || undefined,
    });

    await prisma.warmupEvent.update({
      where: { id: originalEvent.id },
      data: { status: "REPLIED", repliedAt: new Date() },
    });

    await prisma.warmupEvent.create({
      data: {
        senderId: replierAccount.id,
        receiverId: originalEvent.sender.id,
        subject: personalized.subject,
        bodyPreview: personalized.body,
        messageId,
        status: "SENT",
        scheduledFor: new Date(),
        sentAt: new Date(),
      },
    });

    logger.info(
      { originalEventId: originalEvent.id, replyFrom: replierAccount.email },
      "Reply sent"
    );
  } catch (err) {
    logger.error({ err, originalEventId: originalEvent.id }, "Failed to send reply");
  }
}

async function rescueSpam(
  client: ImapFlow,
  account: Account
): Promise<void> {
  const spamFolders = ["[Gmail]/Spam", "Spam", "Junk"];

  for (const folder of spamFolders) {
    let lock;
    try {
      lock = await client.getMailboxLock(folder);
    } catch {
      continue; // Folder doesn't exist, try next
    }

    try {
      const warmupSenders = await prisma.account.findMany({
        where: { status: "ACTIVE" },
        select: { email: true },
      });
      const warmupEmails = new Set(warmupSenders.map((a) => a.email));

      const msgsToMove: number[] = [];

      for await (const msg of client.fetch(
        "1:*",
        { uid: true, envelope: true }
      ) as AsyncIterable<FetchMessageObject>) {
        const fromAddr = msg.envelope?.from?.[0]?.address;
        if (fromAddr && warmupEmails.has(fromAddr)) {
          msgsToMove.push(msg.uid);

          // Find and update the matching WarmupEvent
          const event = await prisma.warmupEvent.findFirst({
            where: {
              receiverId: account.id,
              sender: { email: fromAddr },
              status: { in: ["SENT", "DELIVERED"] },
            },
            orderBy: { scheduledFor: "desc" },
          });

          if (event) {
            await prisma.warmupEvent.update({
              where: { id: event.id },
              data: {
                landedInSpam: true,
                rescuedAt: new Date(),
                status: "RESCUED_FROM_SPAM",
              },
            });

            logger.info(
              { eventId: event.id, accountEmail: account.email, from: fromAddr },
              "Rescued warmup email from spam"
            );
          }
        }
      }

      if (msgsToMove.length > 0) {
        // Move to INBOX using UID sequence string
        const uidStr = msgsToMove.join(",");
        await client.messageMove(uidStr, "INBOX", { uid: true });
        logger.info(
          { count: msgsToMove.length, account: account.email },
          "Moved spam-rescued messages to INBOX"
        );
      }
    } finally {
      lock.release();
    }
    break; // Only process first matching spam folder
  }
}

async function pollAccount(accountId: string): Promise<void> {
  if (activePollSet.has(accountId)) return;
  activePollSet.add(accountId);

  try {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.status !== "ACTIVE") return;

    const config = await prisma.warmupConfig.findUnique({ where: { id: "singleton" } });
    if (!config) return;

    const client = await connectImap(account);
    if (!client) return;

    try {
      if (config.spamRescueEnabled) {
        await rescueSpam(client, account);
      }
      await checkInboxForOpens(client, account, {
        replyProbability: config.replyProbability,
        aiProvider: config.aiProvider,
      });
    } finally {
      try {
        await client.logout();
      } catch {
        try {
          client.close();
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    logger.error({ err, accountId }, "IMAP poll error");
  } finally {
    activePollSet.delete(accountId);
  }
}

async function pollAllAccounts(): Promise<void> {
  const accounts = await prisma.account.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  // Sequential polls — Gmail rate-limits concurrent IMAP from one IP
  for (const a of accounts) {
    await pollAccount(a.id);
  }
}

export function startImapWorker(): IntervalWorkerHandle {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await pollAllAccounts();
    } catch (err) {
      logger.error({ err }, "IMAP worker tick failed");
    } finally {
      running = false;
    }
  };

  // Stagger first IMAP poll slightly so it doesn't collide with SMTP on startup
  const startupDelay = setTimeout(() => void tick(), 30_000);
  const timer = setInterval(() => void tick(), IMAP_INTERVAL_MS);

  logger.info("IMAP worker started (7-minute interval, no Redis)");
  return {
    close: async () => {
      clearTimeout(startupDelay);
      clearInterval(timer);
    },
  };
}
