/**
 * Personalize email subject/body with real sender & receiver names.
 * Templates may use {{senderName}} / {{receiverName}} placeholders,
 * or generic AI names (Alex, Mike, etc.) which get rewritten at send time.
 */

const FAKE_NAMES = [
  "Alex",
  "Mike",
  "John",
  "Sarah",
  "David",
  "James",
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
  "Steve",
  "Bob",
  "Tom",
  "Anna",
  "Emma",
];

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

  if (receiverFirst) {
    // Hi Alex, / Hey Mike, / Hello there, → Hi George,
    personalizedBody = personalizedBody.replace(
      /^(Hi|Hey|Hello)\s+(?:there|\w+)([,!]?\s*)/im,
      `$1 ${receiverFirst}$2`
    );
    // Hi, → Hi George,
    personalizedBody = personalizedBody.replace(
      /^(Hi|Hey|Hello)([,!]\s*)/im,
      `$1 ${receiverFirst}$2`
    );
  }

  // Replace trailing fake sign-off names
  const fakeNamePattern = new RegExp(
    `(\\n|^)(${FAKE_NAMES.join("|")})\\s*$`,
    "i"
  );
  if (fakeNamePattern.test(personalizedBody)) {
    personalizedBody = personalizedBody.replace(fakeNamePattern, `$1${sender}`);
  } else if (
    /(Best|Regards|Cheers|Thanks|Best wishes|Kind regards|Warm regards)\s*,?\s*$/i.test(
      personalizedBody.trim()
    )
  ) {
    personalizedBody = `${personalizedBody.trim()}\n${sender}`;
  } else if (
    !new RegExp(`${escapeRegex(sender)}\\s*$`, "i").test(personalizedBody.trim())
  ) {
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
