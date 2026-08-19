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

const prisma = new PrismaClient();
const IMAP_INTERVAL_MS = 7 * 60 * 1000;

export type IntervalWorkerHandle = {
  close: () => Promise<void>;
};

// Track which accounts we're currently polling (prevent concurrent polls per account)
const activePollSet = new Set<string>();
const replyInFlight = new Set<string>();

/** Statuses that still need an open and/or a NEW→OLD in-thread reply */
const OPENABLE_STATUSES = [
  "SENT",
  "DELIVERED",
  "OPENED",
  "RESCUED_FROM_SPAM",
] as const;

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

async function safeLogout(client: ImapFlow): Promise<void> {
  try {
    if (client.usable) {
      await client.logout();
    } else {
      client.close();
    }
  } catch {
    /* socket already dead */
  }
}

/**
 * Mark unread INBOX mail from a specific sender as \\Seen (Gmail web UI).
 * Uses IMAP SEARCH by FROM — more reliable than scanning all unseen mail.
 */
async function markInboundFromSenderRead(
  account: Account,
  fromEmail: string
): Promise<number> {
  const client = await connectImap(account);
  if (!client) return 0;

  let marked = 0;
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search(
        { seen: false, from: fromEmail },
        { uid: true }
      );
      if (!uids || !Array.isArray(uids) || uids.length === 0) {
        return 0;
      }

      for (const uid of uids) {
        try {
          await client.messageFlagsAdd({ uid }, ["\\Seen"]);
          marked++;
        } catch (err) {
          logger.warn(
            { err, email: account.email, from: fromEmail, uid },
            "Failed to mark single message read"
          );
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.warn(
      { err, email: account.email, from: fromEmail },
      "IMAP search/mark read failed"
    );
  } finally {
    await safeLogout(client);
  }

  if (marked > 0) {
    logger.info(
      { email: account.email, from: fromEmail, marked },
      "Marked inbound mail as read in Gmail"
    );
  }
  return marked;
}

/**
 * Mark unseen INBOX mail from warmup-pool senders as \\Seen in Gmail.
 */
async function markUnseenWarmupSeen(
  client: ImapFlow,
  account: Account,
  onlyFromEmails?: string[]
): Promise<{ marked: number; openedEventIds: string[] }> {
  const pool = await prisma.account.findMany({
    where: onlyFromEmails?.length
      ? { email: { in: onlyFromEmails } }
      : { id: { not: account.id }, role: "OLD" },
    select: { id: true, email: true },
  });

  const openedEventIds: string[] = [];
  let marked = 0;

  const lock = await client.getMailboxLock("INBOX");
  try {
    for (const sender of pool) {
      const fromEmail = sender.email;
      const uids = await client.search(
        { seen: false, from: fromEmail },
        { uid: true }
      );
      if (!uids || !Array.isArray(uids) || uids.length === 0) continue;

      for (const uid of uids) {
        await client.messageFlagsAdd({ uid }, ["\\Seen"]);
        marked++;
      }

      const recentEvent = await prisma.warmupEvent.findFirst({
        where: {
          receiverId: account.id,
          senderId: sender.id,
          status: { in: ["SENT", "DELIVERED", "OPENED"] },
        },
        orderBy: { sentAt: "desc" },
      });
      if (recentEvent) openedEventIds.push(recentEvent.id);
    }
  } finally {
    lock.release();
  }

  return { marked, openedEventIds };
}

async function checkInboxForOpens(
  client: ImapFlow,
  account: Account,
  _config: { replyProbability: number; aiProvider: string }
): Promise<void> {
  const { marked, openedEventIds } = await markUnseenWarmupSeen(client, account);

  if (marked > 0) {
    logger.info(
      { email: account.email, marked },
      "Marked unseen warmup mail as read in Gmail"
    );
  }

  for (const eventId of openedEventIds) {
    try {
      const event = await prisma.warmupEvent.findUnique({
        where: { id: eventId },
      });
      if (!event || event.repliedAt || event.status === "REPLIED") continue;

      await prisma.warmupEvent.update({
        where: { id: eventId },
        data: { status: "OPENED", openedAt: event.openedAt ?? new Date() },
      });
      logger.info(
        { eventId, receiverEmail: account.email },
        "Warmup email marked as OPENED"
      );
    } catch (err) {
      logger.error({ err, eventId }, "Failed OPENED update");
    }
  }
}

/** Short IMAP pass so Gmail shows warmup inbound as read (SMTP replies never do this). */
async function markAllUnseenWarmupRead(
  account: Account,
  onlyFromEmails?: string[]
): Promise<void> {
  const client = await connectImap(account);
  if (!client) return;
  try {
    const { marked } = await markUnseenWarmupSeen(
      client,
      account,
      onlyFromEmails
    );
    if (marked > 0) {
      logger.info(
        { email: account.email, marked, onlyFromEmails },
        "Marked warmup inbound as read in Gmail"
      );
    }
  } catch (err) {
    logger.warn(
      { err, email: account.email },
      "Could not mark warmup inbound as read"
    );
  } finally {
    await safeLogout(client);
  }
}

async function sendReply(
  originalEvent: { id: string; subject: string; bodyPreview: string; messageId: string | null; sender: Account },
  replierAccount: Account,
  aiProvider: string
): Promise<void> {
  try {
    const latest = await prisma.warmupEvent.findUnique({
      where: { id: originalEvent.id },
      select: { status: true, repliedAt: true },
    });
    if (!latest || latest.repliedAt || latest.status === "REPLIED") return;

    // Read first (like a human), then reply — SMTP alone never clears Gmail unread
    const markedRead = await markInboundFromSenderRead(
      replierAccount,
      originalEvent.sender.email
    );
    if (markedRead === 0) {
      logger.warn(
        {
          replier: replierAccount.email,
          from: originalEvent.sender.email,
        },
        "No unread message found to mark read before reply — will retry after send"
      );
    } else {
      await prisma.warmupEvent.update({
        where: { id: originalEvent.id },
        data: { status: "OPENED", openedAt: new Date() },
      });
    }

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
      originalSenderName,
      replierAccount.role
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
      {
        originalEventId: originalEvent.id,
        replyFrom: replierAccount.email,
        replyTo: originalEvent.sender.email,
        markedReadBeforeReply: markedRead,
      },
      "NEW account in-thread reply sent to OLD"
    );

    // Backup: mark read again after reply (Gmail thread can stay bold otherwise)
    if (markedRead === 0) {
      await markInboundFromSenderRead(
        replierAccount,
        originalEvent.sender.email
      );
    }
  } catch (err) {
    logger.error({ err, originalEventId: originalEvent.id }, "Failed to send reply");
  }
}

/**
 * NEW accounts always reply in-thread to OLD warmup mail.
 * Does not depend on IMAP succeeding — SMTP is enough so George still
 * replies when Gmail IMAP times out on Contabo.
 */
export async function processPendingNewReplies(): Promise<void> {
  const config = await prisma.warmupConfig.findUnique({
    where: { id: "singleton" },
  });
  if (!config) return;

  const now = Date.now();
  const openedReady = new Date(now - 2 * 60 * 1000);
  const sentReady = new Date(now - 12 * 60 * 1000);
  const since = new Date(now - 24 * 60 * 60 * 1000);

  const candidates = await prisma.warmupEvent.findMany({
    where: {
      repliedAt: null,
      status: { in: [...OPENABLE_STATUSES] },
      receiver: { role: "NEW", status: "ACTIVE" },
      sender: { role: "OLD", status: "ACTIVE" },
      OR: [
        { openedAt: { lte: openedReady, gte: since } },
        { sentAt: { lte: sentReady, gte: since } },
      ],
    },
    include: { sender: true, receiver: true },
    orderBy: { sentAt: "asc" },
    take: 3,
  });

  if (candidates.length > 0) {
    logger.info(
      { count: candidates.length },
      "Pending NEW→OLD in-thread replies"
    );

    for (const event of candidates) {
      if (replyInFlight.has(event.id)) continue;
      replyInFlight.add(event.id);
      try {
        await sendReply(event, event.receiver, config.aiProvider);
      } finally {
        replyInFlight.delete(event.id);
      }
    }
  }

  // NEW inboxes: mark any remaining unread from OLD client accounts
  const newAccounts = await prisma.account.findMany({
    where: { status: "ACTIVE", role: "NEW" },
    include: {
      receivedEvents: {
        where: {
          status: { in: ["SENT", "OPENED", "REPLIED"] },
          sender: { role: "OLD" },
          sentAt: { gte: since },
        },
        include: { sender: true },
        take: 20,
      },
    },
  });

  for (const account of newAccounts) {
    const seen = new Set<string>();
    const senderEmails: string[] = [];
    for (const e of account.receivedEvents) {
      const addr = e.sender.email.toLowerCase();
      if (!seen.has(addr)) {
        seen.add(addr);
        senderEmails.push(addr);
      }
    }
    if (senderEmails.length === 0) {
      await markAllUnseenWarmupRead(account);
      continue;
    }
    for (const from of senderEmails) {
      await markInboundFromSenderRead(account, from);
    }
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

      // Only unseen spam — fetching 1:* on a large Spam folder causes ETIMEOUT
      for await (const msg of client.fetch(
        { seen: false },
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
                // Keep SENT so the open/reply funnel still runs
                status:
                  event.status === "SENT" || event.status === "DELIVERED"
                    ? event.status
                    : "SENT",
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
      // INBOX first: mark warmup mail read before spam rescue can time out the socket
      try {
        await checkInboxForOpens(client, account, {
          replyProbability: config.replyProbability,
          aiProvider: config.aiProvider,
        });
      } catch (err) {
        logger.warn(
          { err, email: account.email },
          "INBOX open-check failed — replies still go out via SMTP fallback"
        );
      }
      if (config.spamRescueEnabled) {
        try {
          await rescueSpam(client, account);
        } catch (err) {
          logger.warn(
            { err, email: account.email },
            "Spam rescue skipped (IMAP error)"
          );
        }
      }
    } finally {
      await safeLogout(client);
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
      await processPendingNewReplies();
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
