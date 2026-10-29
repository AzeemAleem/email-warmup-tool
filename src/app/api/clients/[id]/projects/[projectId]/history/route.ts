import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    return NextResponse.json({ calculations, invoices });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
