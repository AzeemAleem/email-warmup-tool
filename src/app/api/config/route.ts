import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ConfigSchema = z.object({
  rampUpDays: z.number().int().min(7).max(90),
  startVolumePerDay: z.number().int().min(1).max(10),
  maxVolumePerDay: z.number().int().min(1).max(50),
  minDelayBetweenSendsMs: z.number().int().min(60000),
  maxDelayBetweenSendsMs: z.number().int().min(120000),
  replyProbability: z.number().min(0).max(1),
  spamRescueEnabled: z.boolean(),
  activeHourStart: z.number().int().min(0).max(23),
  activeHourEnd: z.number().int().min(1).max(23),
  minPairCooldownHours: z.number().int().min(1).max(48),
  aiProvider: z.enum(["gemini", "groq", "none"]),
  timezone: z.string().default("UTC"),
  maxInboundPerReceiverPerDay: z.number().int().min(1).max(20),
  maxInboundPerReceiverPerHour: z.number().int().min(1).max(10),
  minGapBetweenInboundMs: z.number().int().min(600000), // min 10 min
  maxSendsPerTick: z.number().int().min(1).max(10),
  maxSendsToSameReceiverPerTick: z.number().int().min(1).max(5),
  maxOldDailySendsWhenFewNew: z.number().int().min(1).max(20),
});

export async function GET() {
  try {
    await requireAuth();
    const config = await prisma.warmupConfig.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = ConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const config = await prisma.warmupConfig.upsert({
      where: { id: "singleton" },
      update: parsed.data,
      create: { id: "singleton", ...parsed.data },
    });

    return NextResponse.json(config);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT /api/config", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
