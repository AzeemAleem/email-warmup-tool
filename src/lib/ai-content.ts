import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import {
  getAllPackagingTemplates,
  getRandomPackagingTemplate,
  getRandomPackagingReply,
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

/** Generate email content — always from the packaging question pool */
export async function generateEmailContent(
  _provider: string = "gemini"
): Promise<EmailContent> {
  return getRandomPackagingTemplate();
}

export async function generateReplyContent(
  originalSubject: string,
  originalBody: string,
  provider: string = "gemini",
  _replyerName: string = ""
): Promise<EmailContent> {
  // Prefer curated packaging replies; AI is optional and must stay on-topic
  if (provider === "none" || Math.random() < 0.7) {
    return getRandomPackagingReply(originalSubject);
  }

  const prompt = REPLY_PROMPT_TEMPLATE(originalSubject, originalBody);

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

  return getRandomPackagingReply(originalSubject);
}

/** Seed / refresh DB template cache from packaging pool only (no generic AI filler) */
export async function generateTemplateBatch(
  count: number,
  _provider: string = "gemini"
): Promise<EmailContent[]> {
  const pool = getAllPackagingTemplates();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  if (shuffled.length >= count) {
    return shuffled.slice(0, count);
  }
  const results = [...shuffled];
  while (results.length < count) {
    results.push(getRandomPackagingTemplate());
  }
  return results;
}
