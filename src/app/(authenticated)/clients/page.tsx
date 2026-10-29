import { prisma } from "@/lib/db";
import { ClientsClient } from "./ClientsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients — Pacify" };

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { projects: true } },
      projects: {
        select: { id: true, dealType: true },
      },
    },
  });

  const serialized = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    _count: c._count,
    projects: c.projects,
    hasWon: c.projects.some((p) => p.dealType === "WON"),
  }));

  return <ClientsClient initial={serialized} />;
}
