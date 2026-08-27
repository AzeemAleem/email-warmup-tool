import { PrismaClient } from "@prisma/client";

/** Single Prisma client for the worker — avoids exhausting Supabase connection limits */
const globalForWorkerPrisma = globalThis as unknown as {
  workerPrisma: PrismaClient | undefined;
};

export const workerPrisma =
  globalForWorkerPrisma.workerPrisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForWorkerPrisma.workerPrisma = workerPrisma;
}

export default workerPrisma;
