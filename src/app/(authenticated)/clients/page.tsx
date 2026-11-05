import { prisma } from "@/lib/db";
import { ClientsClient } from "./ClientsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients — Pacify" };

export default async function ClientsPage() {
  // Lean read: project count + at most one WON id for badge (no schema change)
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { projects: true } },
      projects: {
        where: { dealType: "WON" },
        select: { id: true },
        take: 1,
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
    hasWon: c.projects.length > 0,
  }));

  return <ClientsClient initial={serialized} />;
}
