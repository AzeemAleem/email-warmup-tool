import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

export interface EmailContent {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `Generate a short, natural, plausible business/personal email.
It should read like a real 1-2 person email exchange - varied subject lines, greetings, and sign-offs.
Avoid spam trigger words (free, guarantee, click here, act now, limited time, winner).
Keep it under 120 words. Vary tone: some casual, some professional, some brief, some slightly longer.
Do NOT invent a person's real name. Use these exact placeholders:
- Greeting: use {{receiverName}} (e.g. "Hi {{receiverName}},")
- Sign-off name on its own last line: {{senderName}}
Example ending:
Best,
{{senderName}}

Return JSON only: {"subject": "...", "body": "..."}`;

const REPLY_PROMPT_TEMPLATE = (
  originalSubject: string,
  originalBody: string,
  replyerName: string
) => `
Generate a short, natural reply to the following email thread.
Acknowledge something from the original, keep under 80 words, vary tone.
Avoid spam trigger words.
Sign off as {{senderName}} (placeholder). Do not invent another name.
The replier's display name will be substituted for {{senderName}} (currently: ${replyerName}).
Return JSON: {"subject": "Re: ${originalSubject}", "body": "..."}

Original email:
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
  const text = result.response.text();
  return parseJsonResponse(text);
}

async function generateWithGroq(prompt: string): Promise<EmailContent> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const text = completion.choices[0]?.message?.content || "";
  return parseJsonResponse(text);
}

/** Generate email content using configured AI provider with fallback */
export async function generateEmailContent(
  provider: string = "gemini"
): Promise<EmailContent> {
  if (provider === "none") {
    return getFallbackContent();
  }

  try {
    if (provider === "gemini") {
      return await generateWithGemini(SYSTEM_PROMPT);
    } else if (provider === "groq") {
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
      console.warn("Gemini quota exceeded, falling back to Groq");
      try {
        return await generateWithGroq(SYSTEM_PROMPT);
      } catch {
        return getFallbackContent();
      }
    }
    return getFallbackContent();
  }

  return getFallbackContent();
}

/** Generate a reply to an existing email */
export async function generateReplyContent(
  originalSubject: string,
  originalBody: string,
  provider: string = "gemini",
  replyerName: string = "{{senderName}}"
): Promise<EmailContent> {
  const prompt = REPLY_PROMPT_TEMPLATE(
    originalSubject,
    originalBody,
    replyerName
  );

  if (provider === "none") {
    return {
      subject: `Re: ${originalSubject}`,
      body: `Got it, thanks for the update!\n\nBest,\n{{senderName}}`,
    };
  }

  try {
    if (provider === "gemini") {
      return await generateWithGemini(prompt);
    } else if (provider === "groq") {
      return await generateWithGroq(prompt);
    }
  } catch {
    return {
      subject: `Re: ${originalSubject}`,
      body: `Thanks for reaching out. I'll get back to you shortly.\n\nBest,\n{{senderName}}`,
    };
  }

  return {
    subject: `Re: ${originalSubject}`,
    body: `Thanks for the email, noted.\n\nBest,\n{{senderName}}`,
  };
}

/** Static fallback pool when AI is unavailable — placeholders filled at send time */
function getFallbackContent(): EmailContent {
  const templates: EmailContent[] = [
    {
      subject: "Quick update",
      body: "Hi {{receiverName}},\n\nJust wanted to share a quick update on the project. Everything is on track for the deadline.\n\nBest,\n{{senderName}}",
    },
    {
      subject: "Following up",
      body: "Hey {{receiverName}},\n\nJust following up on our last conversation. Let me know when you have a minute to chat.\n\nThanks,\n{{senderName}}",
    },
    {
      subject: "Meeting notes",
      body: "Hi {{receiverName}},\n\nHere are the key takeaways from today's meeting. Please review and let me know if I missed anything.\n\nRegards,\n{{senderName}}",
    },
    {
      subject: "Checking in",
      body: "Hi {{receiverName}},\n\nHope you're doing well! Just checking in to see how things are progressing on your end.\n\nBest wishes,\n{{senderName}}",
    },
    {
      subject: "Resource sharing",
      body: "Hi {{receiverName}},\n\nThought this might be useful for what we discussed. Let me know your thoughts when you get a chance.\n\nCheers,\n{{senderName}}",
    },
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/** Generate a batch of email templates for DB caching */
export async function generateTemplateBatch(
  count: number,
  provider: string = "gemini"
): Promise<EmailContent[]> {
  const results: EmailContent[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const content = await generateEmailContent(provider);
      results.push(content);
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      results.push(getFallbackContent());
    }
  }
  return results;
}
