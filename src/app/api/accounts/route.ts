import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const CreateAccountSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  role: z.enum(["OLD", "NEW"]),
  appPassword: z.string().min(8),
  imapHost: z.string().default("imap.gmail.com"),
  imapPort: z.number().int().default(993),
  smtpHost: z.string().default("smtp.gmail.com"),
  smtpPort: z.number().int().default(465),
});

export async function GET() {
  try {
    await requireAuth();
    const accounts = await prisma.account.findMany({
      where: { status: { not: "REMOVED" } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = CreateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, displayName, role, appPassword, imapHost, imapPort, smtpHost, smtpPort } =
      parsed.data;

    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      if (existing.status === "REMOVED") {
        // Re-activate
        const encryptedPassword = encrypt(appPassword);
        const updated = await prisma.account.update({
          where: { id: existing.id },
          data: {
            displayName,
            role,
            appPassword: encryptedPassword,
            imapHost,
            imapPort,
            smtpHost,
            smtpPort,
            status: "ACTIVE",
            warmupStartedAt: new Date(),
            trustWeight: role === "OLD" ? 1.0 : 0,
            dailyTargetVolume: role === "OLD" ? 10 : 2,
            sentToday: 0,
            lastError: null,
          },
        });
        return NextResponse.json(updated, { status: 200 });
      }
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const encryptedPassword = encrypt(appPassword);

    const account = await prisma.account.create({
      data: {
        email,
        displayName,
        role,
        appPassword: encryptedPassword,
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
        status: "ACTIVE",
        trustWeight: role === "OLD" ? 1.0 : 0,
        dailyTargetVolume: role === "OLD" ? 10 : 2,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/accounts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
