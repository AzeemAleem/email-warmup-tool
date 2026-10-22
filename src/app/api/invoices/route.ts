import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";
import type { InvoiceDraftPayload } from "@/lib/invoice/draft";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DraftSchema = z.object({
  quoteNo: z.string().min(1),
  dateStr: z.string(),
  validStr: z.string(),
  clientName: z.string(),
  clientEmail: z.string(),
  orderTitle: z.string(),
  sizeText: z.string(),
  styleText: z.string(),
  colorText: z.string(),
  brandingText: z.string(),
  checkedIds: z.array(z.string()),
  qtyRaw: z.string(),
  priceRaw: z.string(),
  currency: z.enum(["PKR", "USD"]),
  includePage2: z.boolean(),
  optTables: z.array(
    z.object({
      title: z.string(),
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    }),
  ),
  volRows: z.array(
    z.object({
      qty: z.string(),
      unitPrice: z.string(),
    }),
  ),
});

const SaveSchema = z.object({
  payload: DraftSchema,
});

function summaryFromPayload(payload: InvoiceDraftPayload) {
  const qty = parseInt(payload.qtyRaw, 10);
  const unitPrice = parseFloat(payload.priceRaw);
  const quantity = Number.isInteger(qty) && qty >= 1 ? qty : null;
  const price = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : null;
  const totalAmount =
    quantity != null && price != null ? quantity * price : null;
  return {
    quoteNo: payload.quoteNo,
    clientName: payload.clientName.trim(),
    clientEmail: payload.clientEmail.trim(),
    orderTitle: payload.orderTitle.trim(),
    currency: payload.currency,
    quantity,
    unitPrice: price,
    totalAmount,
  };
}

export async function GET() {
  try {
    await requireAuth();
    const invoices = await prisma.invoice.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        quoteNo: true,
        clientName: true,
        clientEmail: true,
        orderTitle: true,
        currency: true,
        quantity: true,
        unitPrice: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data.payload as InvoiceDraftPayload;
    const summary = summaryFromPayload(payload);

    const created = await prisma.invoice.create({
      data: {
        ...summary,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[invoices POST]", err);
    return NextResponse.json({ error: "Failed to save invoice" }, { status: 500 });
  }
}
