import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import {
  getAllPackagingTemplates,
  getRandomPackagingTemplate,
  EmailContent,
} from "./email-templates";

export type { EmailContent };

const SYSTEM_PROMPT = `Generate a short, natural B2B packaging / supply-chain email.
Topics can include quotes, invoices, production status, reorders, materials, shipping,
printing, samples, MOQ, certifications, or product-specific packaging questions.
Avoid spam words (free, guarantee, click here, act now, limited time, winner).
Keep under 80 words for the BODY ONLY — do NOT include greeting or signature.
Do NOT invent real person names in the body.
Return JSON only: {"subject": "...", "body": "..."}`;

const REPLY_PROMPT_TEMPLATE = (
  originalSubject: string,
  originalBody: string
) => `
Write a short natural reply to this packaging-business email.
Acknowledge something specific, keep under 60 words for BODY ONLY.
No greeting or signature lines — those are added separately.
Return JSON: {"subject": "Re: ${originalSubject}", "body": "..."}

Original:
Subject: ${originalSubject}
Body: ${originalBody}
`;

function parseJsonResponse(text: string): EmailContent {
  const jsonMatch = text.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No valid JSON in AI response");
  return JSON.parse(jsonMatch[0]) as EmailContent;
}

async function generateWithGemini(prompt: string): Promise<EmailContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text());
}

async function generateWithGroq(prompt: string): Promise<EmailContent> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const text = completion.choices[0]?.message?.content || "";
  return parseJsonResponse(text);
}

/** Generate email content — packaging templates preferred; AI optional */
export async function generateEmailContent(
  provider: string = "gemini"
): Promise<EmailContent> {
  // Prefer curated packaging pool for consistency + variety
  if (provider === "none" || Math.random() < 0.85) {
    return getRandomPackagingTemplate();
  }

  try {
    if (provider === "gemini") {
      return await generateWithGemini(SYSTEM_PROMPT);
    }
    if (provider === "groq") {
      return await generateWithGroq(SYSTEM_PROMPT);
    }
  } catch (err: unknown) {
    const error = err as Error;
    if (
      provider === "gemini" &&
      (error.message?.includes("quota") ||
        error.message?.includes("RESOURCE_EXHAUSTED") ||
        error.message?.includes("429"))
    ) {
      try {
        return await generateWithGroq(SYSTEM_PROMPT);
      } catch {
        return getRandomPackagingTemplate();
      }
    }
  }

  return getRandomPackagingTemplate();
}

export async function generateReplyContent(
  originalSubject: string,
  originalBody: string,
  provider: string = "gemini",
  _replyerName: string = ""
): Promise<EmailContent> {
  const prompt = REPLY_PROMPT_TEMPLATE(originalSubject, originalBody);

  const fallbacks: EmailContent[] = [
    {
      subject: `Re: ${originalSubject}`,
      body: "Thanks for the note — I'll review this and get back to you shortly with an update.",
    },
    {
      subject: `Re: ${originalSubject}`,
      body: "Got it, thanks. I'll check on our side and follow up once I have a clear answer.",
    },
    {
      subject: `Re: ${originalSubject}`,
      body: "Appreciate you sending this over. Let me confirm the details and reply with next steps.",
    },
  ];

  if (provider === "none") {
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    if (provider === "gemini") {
      return await generateWithGemini(prompt);
    }
    if (provider === "groq") {
      return await generateWithGroq(prompt);
    }
  } catch {
    /* fall through */
  }

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/** Seed / refresh DB template cache from packaging pool (+ optional AI) */
export async function generateTemplateBatch(
  count: number,
  provider: string = "gemini"
): Promise<EmailContent[]> {
  const pool = getAllPackagingTemplates();
  const results: EmailContent[] = [];

  // Always include shuffled packaging templates first
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const t of shuffled.slice(0, Math.min(count, shuffled.length))) {
    results.push(t);
  }

  while (results.length < count) {
    try {
      results.push(await generateEmailContent(provider));
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      results.push(getRandomPackagingTemplate());
    }
  }

  return results;
}
