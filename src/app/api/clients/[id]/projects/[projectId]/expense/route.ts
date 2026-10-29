import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const optionalNum = z
  .union([z.number(), z.null()])
  .optional()
  .nullable();

const ExpenseSchema = z.object({
  totalAmountUsd: optionalNum,
  deductionUsd: optionalNum,
  remainingAmountUsd: optionalNum,
  usdRate: z.number().positive().optional(),
  productionCostPkr: optionalNum,
  shippingCostPkr: optionalNum,
  totalWeightKg: optionalNum,
  shippingPerKgPkr: optionalNum,
  shipToCountry: z.string().max(100).optional().nullable().or(z.literal("")),
  totalExpensePkr: optionalNum,
  profitPkr: optionalNum,
  paymentMethod: z
    .enum(["PAYPAL", "WISE", "PAYONEER", "BANK", "OTHER"])
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().max(3000).optional().nullable().or(z.literal("")),
});

function numOrNull(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; projectId: string } },
) {
  try {
    await requireAuth();
    const project = await prisma.project.findFirst({
      where: { id: params.projectId, clientId: params.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const expense = await prisma.actualExpense.findUnique({
      where: { projectId: params.projectId },
    });
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; projectId: string } },
) {
  try {
    await requireAuth();
    const project = await prisma.project.findFirst({
      where: { id: params.projectId, clientId: params.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = ExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const d = parsed.data;
    const data = {
      totalAmountUsd: numOrNull(d.totalAmountUsd ?? null),
      deductionUsd: numOrNull(d.deductionUsd ?? null),
      remainingAmountUsd: numOrNull(d.remainingAmountUsd ?? null),
      usdRate: d.usdRate != null && d.usdRate > 0 ? d.usdRate : 280,
      productionCostPkr: numOrNull(d.productionCostPkr ?? null),
      shippingCostPkr: numOrNull(d.shippingCostPkr ?? null),
      totalWeightKg: numOrNull(d.totalWeightKg ?? null),
      shippingPerKgPkr: numOrNull(d.shippingPerKgPkr ?? null),
      shipToCountry: d.shipToCountry?.trim() || null,
      totalExpensePkr: numOrNull(d.totalExpensePkr ?? null),
      profitPkr: numOrNull(d.profitPkr ?? null),
      paymentMethod: d.paymentMethod?.trim() || null,
      notes: d.notes?.trim() || null,
    };

    const expense = await prisma.actualExpense.upsert({
      where: { projectId: params.projectId },
      create: { projectId: params.projectId, ...data },
      update: data,
    });

    return NextResponse.json(expense);
  } catch (err) {
    console.error("[expense PUT]", err);
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; projectId: string } },
) {
  try {
    await requireAuth();
    const existing = await prisma.actualExpense.findFirst({
      where: {
        projectId: params.projectId,
        project: { clientId: params.id },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.actualExpense.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[expense DELETE]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
