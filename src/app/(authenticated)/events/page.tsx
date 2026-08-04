import { prisma } from "@/lib/db";
import { EventsTable } from "./EventsTable";

export const dynamic = "force-dynamic";

interface EventsPageProps {
  searchParams: {
    status?: string;
    search?: string;
    page?: string;
  };
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.search) {
    where.OR = [
      { subject: { contains: params.search, mode: "insensitive" } },
      { sender: { email: { contains: params.search, mode: "insensitive" } } },
      { receiver: { email: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [events, total] = await Promise.all([
    prisma.warmupEvent.findMany({
      where,
      include: {
        sender: { select: { email: true, role: true } },
        receiver: { select: { email: true, role: true } },
      },
      orderBy: { scheduledFor: "desc" },
      take: pageSize,
      skip,
    }),
    prisma.warmupEvent.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Event Log</h1>
        <p className="text-sm text-gray-400 mt-1">
          {total.toLocaleString()} total warmup events
        </p>
      </div>

      <EventsTable
        events={events}
        total={total}
        page={page}
        totalPages={totalPages}
        currentStatus={params.status || "ALL"}
        currentSearch={params.search || ""}
      />
    </div>
  );
}
