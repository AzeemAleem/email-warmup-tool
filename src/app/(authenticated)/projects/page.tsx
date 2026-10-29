import { prisma } from "@/lib/db";
import { ProjectsClient } from "./ProjectsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects — Pacify" };

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const serialized = projects.map((p) => {
    const pr = p as typeof p & {
      trackingId?: string | null;
      startDate?: Date | null;
      deadline?: Date | null;
    };
    return {
      id: pr.id,
      clientId: pr.clientId,
      name: pr.name,
      status: pr.status,
      dealType: (pr as { dealType?: string }).dealType ?? "QUOTATION",
      trackingId: pr.trackingId ?? null,
      startDate: pr.startDate ? pr.startDate.toISOString() : null,
      deadline: pr.deadline ? pr.deadline.toISOString() : null,
      notes: pr.notes,
      createdAt: pr.createdAt.toISOString(),
      updatedAt: pr.updatedAt.toISOString(),
      client: pr.client,
    };
  });

  return <ProjectsClient initial={serialized} />;
}
