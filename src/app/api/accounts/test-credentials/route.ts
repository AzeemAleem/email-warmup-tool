import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { testCredentials } from "@/lib/credential-test";
import { z } from "zod";

const TestSchema = z.object({
  email: z.string().email(),
  appPassword: z.string().min(1),
  smtpHost: z.string().default("smtp.gmail.com"),
  smtpPort: z.number().int().default(465),
  imapHost: z.string().default("imap.gmail.com"),
  imapPort: z.number().int().default(993),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = TestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, appPassword, smtpHost, smtpPort, imapHost, imapPort } = parsed.data;

    const result = await testCredentials(
      email,
      appPassword,
      smtpHost,
      smtpPort,
      imapHost,
      imapPort
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Credential test failed" }, { status: 500 });
  }
}
