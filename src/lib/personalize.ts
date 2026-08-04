/**
 * Personalize email subject/body with real sender & receiver names.
 * Templates may use {{senderName}} / {{receiverName}} placeholders,
 * or generic AI sign-offs (Alex, etc.) which get rewritten at send time.
 */

const FAKE_SIGN_OFF_NAMES = [
  "Alex",
  "Jordan",
  "Sam",
  "Taylor",
  "Casey",
  "Morgan",
  "Riley",
  "Jamie",
  "Avery",
  "Quinn",
  "Chris",
  "Pat",
  "Dana",
  "Robin",
];

/** Prefer display name; else local-part of email before @ */
export function resolveDisplayName(
  displayName: string | null | undefined,
  email: string
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0] || email;
  // george.pacifypackaging → George
  const first = local.split(/[._+\-]/)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** First token for greetings: "George Pacify" → "George" */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function personalizeEmailContent(
  subject: string,
  body: string,
  senderName: string,
  receiverName?: string
): { subject: string; body: string } {
  const sender = senderName.trim() || "there";
  const receiver = receiverName?.trim();
  const receiverFirst = receiver ? firstName(receiver) : undefined;

  let personalizedSubject = subject
    .replace(/\{\{\s*senderName\s*\}\}/gi, sender)
    .replace(/\{\{\s*receiverName\s*\}\}/gi, receiverFirst || "there");

  let personalizedBody = body
    .replace(/\{\{\s*senderName\s*\}\}/gi, sender)
    .replace(/\{\{\s*receiverName\s*\}\}/gi, receiverFirst || "there");

  // Fix generic greetings when we know the receiver
  if (receiverFirst) {
    personalizedBody = personalizedBody
      .replace(/^(Hi|Hey|Hello)(\s+there)?([,!]?\s*)/i, `$1 ${receiverFirst}$3`)
      .replace(/^(Hi|Hey|Hello)\s+\{\{[^}]+\}\}([,!]?\s*)/i, `$1 ${receiverFirst}$2`);
  }

  // Replace trailing fake sign-off names (Best,\nAlex → Best,\nGeorge)
  const fakeNamePattern = new RegExp(
    `(\\n|^)(${FAKE_SIGN_OFF_NAMES.join("|")})\\s*$`,
    "i"
  );
  if (fakeNamePattern.test(personalizedBody)) {
    personalizedBody = personalizedBody.replace(fakeNamePattern, `$1${sender}`);
  } else if (
    /(Best|Regards|Cheers|Thanks|Best wishes|Kind regards|Warm regards)\s*,?\s*$/i.test(
      personalizedBody.trim()
    )
  ) {
    // Sign-off with no name — append sender name
    personalizedBody = `${personalizedBody.trim()}\n${sender}`;
  } else if (
    !new RegExp(`${escapeRegex(sender)}\\s*$`, "i").test(personalizedBody.trim())
  ) {
    // No recognizable sign-off — add a simple one
    personalizedBody = `${personalizedBody.trim()}\n\nBest,\n${sender}`;
  }

  return {
    subject: personalizedSubject.trim(),
    body: personalizedBody.trim(),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
