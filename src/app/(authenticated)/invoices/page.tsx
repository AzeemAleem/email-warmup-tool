import Link from "next/link";
import { prisma } from "@/lib/db";
import { InvoicesTable } from "./InvoicesTable";

export const dynamic = "force-dynamic";

export default async function SavedInvoicesPage() {
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

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Saved Invoices</h1>
          <p className="text-sm text-gray-400 mt-1">
            All quotations saved to the database. Click Edit to open and update one.
          </p>
        </div>
        <Link
          href="/invoice-generator"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors"
        >
          New quote
        </Link>
      </div>

      <InvoicesTable invoices={invoices} />
    </div>
  );
}
