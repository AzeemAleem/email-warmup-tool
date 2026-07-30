import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

export interface CredentialTestResult {
  smtp: { ok: boolean; error?: string };
  imap: { ok: boolean; error?: string };
  allOk: boolean;
}

export async function testSmtpCredentials(
  email: string,
  appPassword: string,
  smtpHost: string,
  smtpPort: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: email,
        pass: appPassword,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.verify();
    transporter.close();
    return { ok: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { ok: false, error: error.message || "SMTP connection failed" };
  }
}

export async function testImapCredentials(
  email: string,
  appPassword: string,
  imapHost: string,
  imapPort: number
): Promise<{ ok: boolean; error?: string }> {
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
    connectionTimeout: 10000,
  });

  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err: unknown) {
    const error = err as Error;
    try {
      client.close();
    } catch {}
    return { ok: false, error: error.message || "IMAP connection failed" };
  }
}

export async function testCredentials(
  email: string,
  appPassword: string,
  smtpHost: string,
  smtpPort: number,
  imapHost: string,
  imapPort: number
): Promise<CredentialTestResult> {
  const [smtp, imap] = await Promise.all([
    testSmtpCredentials(email, appPassword, smtpHost, smtpPort),
    testImapCredentials(email, appPassword, imapHost, imapPort),
  ]);

  return {
    smtp,
    imap,
    allOk: smtp.ok && imap.ok,
  };
}
