import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Lazy Prisma accessor — avoids crashing `next build` when env/DB isn't ready at import time */
export const prisma =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createPrismaClient();
      }
      const client = globalForPrisma.prisma;
      const value = (client as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });

export default prisma;
