/**
 * Quick DB connectivity check — run on Contabo or locally:
 *   node scripts/check-db-connection.js
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

async function main() {
  const url = process.env.DATABASE_URL || "";
  const hostMatch = url.match(/@([^:/]+)/);
  const host = hostMatch ? hostMatch[1] : "(unknown)";

  console.log("DATABASE_URL host:", host);
  if (host.startsWith("db.") && host.endsWith(".supabase.co")) {
    console.warn(
      "\n⚠  Direct Supabase host (db.*.supabase.co) is IPv6-only and often fails from VPS/serverless."
    );
    console.warn(
      "   Use Session pooler (port 5432) on Contabo or Transaction pooler (6543) on Vercel."
    );
    console.warn("   See .env.example for the correct URL format.\n");
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'WarmupConfig' AND column_name = 'maxInboundPerReceiverPerDay'
    `;
    if (tables.length === 0) {
      console.error(
        "❌ Connected but schema is incomplete — run: npx prisma migrate deploy"
      );
      process.exit(1);
    }
    console.log("✅ Database connected and schema looks OK");
  } catch (err) {
    console.error("❌ Database connection failed:");
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
