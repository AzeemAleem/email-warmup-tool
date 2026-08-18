/**
 * Personalize email subject/body with real names.
 *
 * OLD (client) — inquiry / interest, no Pacify branding:
 *   Hi {FirstName},
 *   {content}
 *   Thanks,
 *   {SenderName}
 *
 * NEW (vendor / Pacify team) — professional reply:
 *   Hi {FirstName},
 *   {content}
 *   Best Regards
 *   {SenderName}
 *   WhatsApp: +12293298221
 *   Pacify Packaging.
 */

const VENDOR_SIGNATURE = `WhatsApp: +12293298221
Pacify Packaging.`;

const CLIENT_CLOSINGS = ["Thanks", "Best", "Regards", "Thank you"] as const;

export type SenderVoice = "client" | "vendor";

/** Prefer display name; else local-part of email before @ */
export function resolveDisplayName(
  displayName: string | null | undefined,
  email: string
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0] || email;
  const first = local.split(/[._+\-]/)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Map account role to email voice */
export function voiceForRole(role: string): SenderVoice {
  return role === "NEW" ? "vendor" : "client";
}

/** Strip existing greeting / sign-off so we can rebuild a clean body */
function extractContentOnly(body: string): string {
  let text = body.replace(/\r\n/g, "\n").trim();

  text = text.replace(/^(Hi|Hey|Hello|Dear)\b[^\n]*\n+/i, "");

  text = text.replace(
    /\n+(Best Regards|Best regards|Kind regards|Warm regards|Regards|Best|Thanks|Thank you|Cheers|Best wishes)[,!]?\s*(\n[\s\S]*)?$/i,
    ""
  );

  // Strip vendor branding if re-processing stored mail
  text = text
    .replace(/WhatsApp:\s*\+12293298221\s*\n?/gi, "")
    .replace(/Pacify Packaging\.?\s*\n?/gi, "")
    .replace(/\{\{\s*senderName\s*\}\}/gi, "")
    .replace(/\{\{\s*receiverName\s*\}\}/gi, "")
    .trim();

  return text;
}

export function personalizeEmailContent(
  subject: string,
  body: string,
  senderName: string,
  receiverName?: string,
  voice: SenderVoice = "client"
): { subject: string; body: string } {
  const sender = senderName.trim() || "Team";
  const receiverFirst = receiverName
    ? firstName(receiverName.trim())
    : "there";

  const personalizedSubject = subject
    .replace(/\{\{\s*senderName\s*\}\}/gi, sender)
    .replace(/\{\{\s*receiverName\s*\}\}/gi, receiverFirst)
    .trim();

  const content = extractContentOnly(
    body
      .replace(/\{\{\s*senderName\s*\}\}/gi, sender)
      .replace(/\{\{\s*receiverName\s*\}\}/gi, receiverFirst)
  );

  let personalizedBody: string;

  if (voice === "client") {
    const closing =
      CLIENT_CLOSINGS[Math.floor(Math.random() * CLIENT_CLOSINGS.length)];
    personalizedBody = [
      `Hi ${receiverFirst},`,
      "",
      content,
      "",
      `${closing},`,
      sender,
    ].join("\n");
  } else {
    personalizedBody = [
      `Hi ${receiverFirst},`,
      "",
      content,
      "",
      "Best Regards",
      sender,
      VENDOR_SIGNATURE,
    ].join("\n");
  }

  return {
    subject: personalizedSubject,
    body: personalizedBody,
  };
}

/** In-thread reply — voice follows replier role (NEW = vendor, OLD = client) */
export function personalizeReplyContent(
  subject: string,
  body: string,
  senderName: string,
  receiverName?: string,
  replierRole: string = "NEW"
): { subject: string; body: string } {
  return personalizeEmailContent(
    subject,
    body,
    senderName,
    receiverName,
    voiceForRole(replierRole)
  );
}
