import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Admin credentials not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env" },
        { status: 500 }
      );
    }

    const emailMatch = email?.toLowerCase() === adminEmail.toLowerCase();
    
    // Support both plain text (dev) and bcrypt hash (prod)
    let passwordMatch = false;
    if (adminPassword.startsWith("$2b$") || adminPassword.startsWith("$2a$")) {
      passwordMatch = await bcrypt.compare(password, adminPassword);
    } else {
      passwordMatch = password === adminPassword;
    }

    if (!emailMatch || !passwordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await getSession();
    session.isLoggedIn = true;
    session.email = email;
    session.userId = "admin";
    await session.save();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
