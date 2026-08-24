/**
 * In-thread replies that stay on the SAME topic as the opening message.
 * Avoids random generic lines (pricing/MOQ) when the thread started about quality, etc.
 */

import type { ThreadReplyPhase } from "./email-templates";

export type ThreadContext = {
  rootSubject: string;
  rootBody: string;
  /** Message being replied to directly (may differ from root on follow-ups) */
  immediateSubject?: string;
  immediateBody?: string;
};

type TopicKind =
  | "quality"
  | "pricing"
  | "production"
  | "sample"
  | "shipping"
  | "material"
  | "reorder"
  | "general";

/** Strip greeting / signature from stored email body */
export function extractThreadContent(body: string): string {
  let text = body.replace(/\r\n/g, "\n").trim();
  text = text.replace(/^(Hi|Hey|Hello|Dear)\b[^\n]*\n+/i, "");
  text = text.replace(
    /\n+(Best Regards|Best regards|Kind regards|Warm regards|Regards|Best|Thanks|Thank you|Cheers)[,!]?\s*(\n[\s\S]*)?$/i,
    ""
  );
  text = text
    .replace(/WhatsApp:\s*\+12293298221\s*\n?/gi, "")
    .replace(/Pacify Packaging\.?\s*\n?/gi, "")
    .trim();
  return text;
}

function detectTopicKind(subject: string, body: string): TopicKind {
  const t = `${subject} ${body}`.toLowerCase();
  if (/quality|batch|finish|inconsist|defect|damaged|issue with/.test(t)) {
    return "quality";
  }
  if (/quote|pricing|price|cost|invoice|moq|breakdown/.test(t)) {
    return "pricing";
  }
  if (/production|lead time|turnaround|status|timeline|expedite/.test(t)) {
    return "production";
  }
  if (/sample|mockup|dieline|artwork|proof/.test(t)) {
    return "sample";
  }
  if (/ship|delivery|transit|parcel|freight/.test(t)) {
    return "shipping";
  }
  if (/material|eco|recycl|print|foil|board weight|insert/.test(t)) {
    return "material";
  }
  if (/reorder|same specs|repeat order/.test(t)) {
    return "reorder";
  }
  return "general";
}

/** Short label for templates when topic is general */
function topicSnippet(subject: string, body: string, maxLen = 80): string {
  const content = extractThreadContent(body);
  const fromBody = content.split(/[.!?]/)[0]?.trim();
  if (fromBody && fromBody.length > 10) {
    return fromBody.length > maxLen
      ? `${fromBody.slice(0, maxLen - 3)}...`
      : fromBody;
  }
  return subject.replace(/^Re:\s*/i, "").trim() || "your packaging inquiry";
}

const REPLIES: Record<
  TopicKind,
  Record<ThreadReplyPhase, string[]>
> = {
  quality: {
    new_vendor: [
      "Thanks for flagging the batch quality point — I'll review with production on the finish inconsistency and get back with findings shortly.",
      "Sorry to hear about the finish variation. I'll check that batch with the team and confirm what happened and how we can fix it.",
      "Appreciate you raising this. I'll look into the batch inconsistency and reply with next steps once production has reviewed it.",
    ],
    old_followup: [
      "Thanks for looking into it. Could you confirm whether the finish issue affected the whole run or just part of the batch?",
      "Appreciate the update. Do you already have a sense of root cause, or is production still reviewing the batch?",
      "That helps — when you have the production review, could you note whether replacements or a credit would be possible?",
    ],
    new_closing: [
      "You're welcome — I'll follow up on this thread once I have the full batch review from production.",
      "Happy to help. I'll send the update on the finish issue here as soon as production confirms.",
      "Of course — we'll keep this thread open until the batch quality review is fully resolved.",
    ],
  },
  pricing: {
    new_vendor: [
      "Thanks for the pricing question — I'll pull together the numbers for this and send a clear breakdown shortly.",
      "Got it. I'll confirm pricing and any volume tiers that apply and reply on this thread.",
      "I'll review the quote details on our side and get back with updated pricing for you.",
    ],
    old_followup: [
      "Thanks. Could you also confirm whether that pricing includes custom printing or if that's quoted separately?",
      "Appreciate it — does the quote change much if we adjust quantity up or down?",
      "Helpful — could you note the lead time that goes with that price point?",
    ],
    new_closing: [
      "You're welcome — send over final specs whenever you're ready and we'll finalize the quote on this thread.",
      "Glad to help with pricing. Reach out here when you want to move forward.",
      "Anytime — we'll keep this quote thread open for follow-up questions.",
    ],
  },
  production: {
    new_vendor: [
      "Thanks — I'll check where your order stands in production and reply with a timeline update shortly.",
      "Got it. I'll confirm status with the floor and send an update on lead time.",
      "I'll pull the latest production status and get back to you on this thread.",
    ],
    old_followup: [
      "Thanks. Could you also confirm whether the current timeline still holds if we add a small quantity?",
      "Appreciate the update — is there a ship date you're targeting once production finishes?",
      "Helpful — will you send tracking once the batch ships?",
    ],
    new_closing: [
      "You're welcome — I'll post any production updates here as they come in.",
      "Happy to help. We'll keep you posted on this thread through completion.",
      "Of course — ping us here if the timeline shifts on your end.",
    ],
  },
  sample: {
    new_vendor: [
      "Thanks — I'll confirm sample availability and the approval steps and reply shortly.",
      "Got it. I'll check what we need for a sample run and send timing and next steps.",
      "I'll review the sample request and get back with options on this thread.",
    ],
    old_followup: [
      "Thanks. Could you confirm how long sample approval usually takes before full production?",
      "Appreciate it — will the sample match final material and print specs?",
      "Helpful — do you need revised artwork before sending the sample?",
    ],
    new_closing: [
      "You're welcome — we'll update this thread once the sample is ready to ship.",
      "Glad to help with samples. Reach out here with any tweaks after you review.",
      "Anytime — we'll keep this sample thread open until you're approved to proceed.",
    ],
  },
  shipping: {
    new_vendor: [
      "Thanks for the shipping question — I'll confirm options and timing and reply shortly.",
      "Got it. I'll check freight details on our side and get back with an answer.",
      "I'll review shipping for this order and follow up on this thread.",
    ],
    old_followup: [
      "Thanks. Could you also confirm whether damage in transit is covered on your side?",
      "Appreciate it — is shipping included in the quote you mentioned?",
      "Helpful — what carrier do you usually use for this type of order?",
    ],
    new_closing: [
      "You're welcome — we'll post tracking here once the shipment goes out.",
      "Happy to help. Keep this thread for any delivery updates.",
      "Of course — reach out here if anything looks off when cartons arrive.",
    ],
  },
  material: {
    new_vendor: [
      "Thanks for the material question — I'll confirm the best option for your product and reply shortly.",
      "Got it. I'll check stock and specs on the material side and get back to you.",
      "I'll review material options with the team and follow up on this thread.",
    ],
    old_followup: [
      "Thanks. Could you also share whether there's a more premium board weight if we need extra strength?",
      "Appreciate it — does that material work for both retail display and shipping?",
      "Helpful — are eco or recyclable alternatives available for the same setup?",
    ],
    new_closing: [
      "You're welcome — we'll keep this thread open for any material tweaks before you order.",
      "Glad to help. Send final specs here when you're ready to proceed.",
      "Anytime — happy to compare material options further on this thread.",
    ],
  },
  reorder: {
    new_vendor: [
      "Thanks for the reorder note — I'll confirm pricing and lead time match your last run and reply shortly.",
      "Got it. I'll check whether the same specs and timeline apply and get back to you.",
      "I'll verify reorder details against your previous order and follow up here.",
    ],
    old_followup: [
      "Thanks. Could you confirm if artwork from the last run can be reused as-is?",
      "Appreciate it — any change in MOQ or price versus the previous order?",
      "Helpful — when would you need the reorder shipped if we confirm today?",
    ],
    new_closing: [
      "You're welcome — send the PO here when you're ready and we'll queue the reorder.",
      "Glad to help. This thread works for any last-minute spec changes.",
      "Of course — we'll keep this open until the reorder is confirmed.",
    ],
  },
  general: {
    new_vendor: [
      "Thanks for your note on {topic} — I'll review on our side and get back with a clear answer shortly.",
      "Got it regarding {topic}. I'll check with the team and follow up on this thread.",
      "Appreciate you reaching out about {topic}. I'll confirm details and reply soon.",
    ],
    old_followup: [
      "Thanks for the reply. On {topic}, could you share a bit more detail so we can move forward?",
      "Appreciate the update. One follow-up on {topic} — what would the next step look like on your side?",
      "That helps. For {topic}, could you confirm timing when you have a moment?",
    ],
    new_closing: [
      "You're welcome — we'll keep this thread open for anything else on {topic}.",
      "Happy to help with {topic}. Reach out here whenever you're ready for next steps.",
      "Of course — thanks for the conversation on {topic}. We're here if you need more.",
    ],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildContextualThreadReply(
  ctx: ThreadContext,
  phase: ThreadReplyPhase
): { subject: string; body: string } {
  const rootContent = extractThreadContent(ctx.rootBody);
  const kind = detectTopicKind(ctx.rootSubject, rootContent);
  const snippet = topicSnippet(ctx.rootSubject, ctx.rootBody);
  const templates = REPLIES[kind][phase];
  let body = pick(templates);
  if (kind === "general") {
    body = body.replace(/\{topic\}/g, snippet);
  }
  const subject = ctx.rootSubject.toLowerCase().startsWith("re:")
    ? ctx.rootSubject
    : `Re: ${ctx.rootSubject.replace(/^Re:\s*/i, "")}`;
  return { subject, body };
}

export function buildThreadReplyPrompt(
  ctx: ThreadContext,
  phase: ThreadReplyPhase
): string {
  const rootContent = extractThreadContent(ctx.rootBody);
  const immediateContent = ctx.immediateBody
    ? extractThreadContent(ctx.immediateBody)
    : rootContent;
  const phaseLabel =
    phase === "new_vendor"
      ? "vendor (Pacify Packaging) first reply to a client inquiry"
      : phase === "old_followup"
        ? "client follow-up in the same thread"
        : "vendor closing thank-you in the same thread";

  return `
Write a short natural B2B packaging email reply. You are writing the ${phaseLabel}.

CRITICAL: Stay on the SAME topic as the thread opening. Do NOT introduce unrelated subjects
(e.g. do not mention pricing/MOQ if the thread is about batch quality, and vice versa).

Thread opening (this defines the topic):
Subject: ${ctx.rootSubject}
Body: ${rootContent}

Message you are replying to directly:
Subject: ${ctx.immediateSubject ?? ctx.rootSubject}
Body: ${immediateContent}

Rules:
- BODY ONLY, under 55 words
- No greeting (Hi...) or signature — added separately
- Acknowledge something specific from the thread opening
- Return JSON only: {"subject": "Re: ...", "body": "..."}
`.trim();
}
