import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Drop heavy cost-line arrays from list payloads; full snapshot loads on expand. */
function slimCalculationSnapshot(snapshot: unknown): Record<string, unknown> {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return {};
  }
  const { items: _items, ...rest } = snapshot as Record<string, unknown>;
  return { ...rest, _itemsDeferred: true };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; projectId: string } },
) {
  try {
    await requireAuth();

    const [calculations, invoices] = await Promise.all([
      prisma.calculation.findMany({
        where: { projectId: params.projectId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          projectId: true,
          type: true,
          label: true,
          snapshot: true,
          createdAt: true,
        },
      }),
      prisma.invoice.findMany({
        where: { projectId: params.projectId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          quoteNo: true,
          clientName: true,
          orderTitle: true,
          currency: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      calculations: calculations.map((c) => ({
        ...c,
        snapshot: slimCalculationSnapshot(c.snapshot),
      })),
      invoices,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
