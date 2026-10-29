import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();
    const calc = await prisma.calculation.findUnique({ where: { id: params.id } });
    if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(calc);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();
    const calc = await prisma.calculation.findUnique({ where: { id: params.id } });
    if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.calculation.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calculations DELETE]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
