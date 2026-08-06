/**
 * Personalize email subject/body with real names and a professional signature.
 *
 * Final body structure:
 *   Hi {FirstName},
 *
 *   {content}
 *
 *   Best Regards
 *   {SenderName}
 *   WhatsApp: +12293298221
 *   Pacify Packaging.
 */

const COMPANY_SIGNATURE = `WhatsApp: +12293298221
Pacify Packaging.`;

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

/** Strip existing greeting / sign-off so we can rebuild a clean professional body */
function extractContentOnly(body: string): string {
  let text = body.replace(/\r\n/g, "\n").trim();

  // Remove leading greeting lines
  text = text.replace(
    /^(Hi|Hey|Hello|Dear)\b[^\n]*\n+/i,
    ""
  );

  // Remove common sign-off blocks at the end
  text = text.replace(
    /\n+(Best Regards|Best regards|Kind regards|Warm regards|Regards|Best|Thanks|Thank you|Cheers|Best wishes)[,!]?\s*(\n[\s\S]*)?$/i,
    ""
  );

  // Remove leftover placeholders / fake closings
  text = text
    .replace(/\{\{\s*senderName\s*\}\}/gi, "")
    .replace(/\{\{\s*receiverName\s*\}\}/gi, "")
    .trim();

  return text;
}

export function personalizeEmailContent(
  subject: string,
  body: string,
  senderName: string,
  receiverName?: string
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

  const personalizedBody = [
    `Hi ${receiverFirst},`,
    "",
    content,
    "",
    "Best Regards",
    sender,
    COMPANY_SIGNATURE,
  ].join("\n");

  return {
    subject: personalizedSubject,
    body: personalizedBody,
  };
}

/** Same professional format for in-thread replies */
export function personalizeReplyContent(
  subject: string,
  body: string,
  senderName: string,
  receiverName?: string
): { subject: string; body: string } {
  return personalizeEmailContent(subject, body, senderName, receiverName);
}
