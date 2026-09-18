import { IronSession, SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
  isLoggedIn: boolean;
}

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  // Build-safe fallback (override in production via env)
  return "fallback-secret-change-in-production-min-32-chars!!";
}

export const sessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: "warmup-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  try {
    return await getIronSession<SessionData>(await cookies(), sessionOptions);
  } catch (err) {
    // Bad/stale cookie after SESSION_SECRET change — clear and start fresh
    console.error("Session decrypt failed; clearing warmup-session cookie", err);
    const cookieStore = await cookies();
    try {
      cookieStore.delete(sessionOptions.cookieName);
    } catch {
      /* ignore */
    }
    return await getIronSession<SessionData>(cookieStore, sessionOptions);
  }
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error("Unauthorized");
  }
  return session;
}
