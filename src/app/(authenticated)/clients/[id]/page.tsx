import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClientDetailClient } from "./ClientDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({ where: { id: params.id } });
  return { title: client ? `${client.name} — Pacify` : "Client — Pacify" };
}

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { projects: { orderBy: { updatedAt: "desc" } } },
  });

  if (!client) notFound();

  const serialized = {
    ...client,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    projects: client.projects.map((p) => ({
      id: p.id,
      clientId: p.clientId,
      name: p.name,
      status: p.status,
      dealType: p.dealType ?? "QUOTATION",
      trackingId: p.trackingId ?? null,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      deadline: p.deadline ? p.deadline.toISOString() : null,
      shippingAddress: p.shippingAddress ?? null,
      requirements: Array.isArray(p.requirements)
        ? (p.requirements as string[])
        : [],
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };

  return <ClientDetailClient initial={serialized} />;
}
