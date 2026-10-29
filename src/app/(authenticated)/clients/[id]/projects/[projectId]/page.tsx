import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProjectDetailClient } from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, clientId: params.id },
  });
  return { title: project ? `${project.name} — Pacify` : "Project — Pacify" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const [project, client] = await Promise.all([
    prisma.project.findFirst({
      where: { id: params.projectId, clientId: params.id },
    }),
    prisma.client.findUnique({ where: { id: params.id } }),
  ]);

  if (!project || !client) notFound();

  const serialized = {
    id: project.id,
    clientId: project.clientId,
    clientName: client.name,
    name: project.name,
    status: project.status,
    dealType: project.dealType ?? "QUOTATION",
    trackingId: project.trackingId ?? null,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    deadline: project.deadline ? project.deadline.toISOString() : null,
    shippingAddress: project.shippingAddress ?? null,
    requirements: Array.isArray(project.requirements)
      ? (project.requirements as string[])
      : [],
    notes: project.notes,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };

  return <ProjectDetailClient initial={serialized} />;
}
