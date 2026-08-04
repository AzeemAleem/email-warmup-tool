import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(
    new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000")
  );
}
