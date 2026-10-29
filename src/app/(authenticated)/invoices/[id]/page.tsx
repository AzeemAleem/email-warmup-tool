import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilSquareIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { prisma } from "@/lib/db";
import type { InvoiceDraftPayload } from "@/lib/invoice/draft";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: { quoteNo: true, orderTitle: true },
  });
  return {
    title: invoice
      ? `${invoice.quoteNo} — Quotation — Pacify`
      : "Invoice — Pacify",
  };
}

export default async function InvoiceViewPage({
  params,
}: {
  params: { id: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          clientId: true,
          client: { select: { name: true } },
        },
      },
    },
  });

  if (!invoice) notFound();

  const payload = invoice.payload as unknown as InvoiceDraftPayload;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {invoice.project ? (
            <Link
              href={`/clients/${invoice.project.clientId}/projects/${invoice.project.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to {invoice.project.name}
            </Link>
          ) : (
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to saved invoices
            </Link>
          )}
          <h1 className="text-lg font-semibold text-white truncate">
            Quotation {invoice.quoteNo}
          </h1>
          {invoice.project && (
            <p className="text-xs text-gray-500">
              {invoice.project.client.name} · {invoice.project.name}
            </p>
          )}
        </div>

        <Link
          href={`/invoice-generator?id=${invoice.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Edit invoice
        </Link>
      </div>

      <InvoicePreview payload={payload} />
    </div>
  );
}
