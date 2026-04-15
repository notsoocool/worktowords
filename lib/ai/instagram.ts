import OpenAI from "openai";
import type { PlannerOutput } from "@/lib/ai/planner";

export type InstagramTone = "casual" | "professional" | "storytelling";

export type InstagramSettings = {
  tone: InstagramTone;
  audience?: string;
  includeEmojis?: boolean;
};

export type InstagramResult = {
  caption: string;
  hashtags: string[];
  bestTime: string;
  suggestions: string[];
};

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeResult(obj: unknown): InstagramResult | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Partial<InstagramResult>;
  if (!isNonEmptyString(o.caption)) return null;
  if (!Array.isArray(o.hashtags) || !o.hashtags.every((t) => typeof t === "string"))
    return null;
  if (!isNonEmptyString(o.bestTime)) return null;
  if (!Array.isArray(o.suggestions) || !o.suggestions.every((s) => typeof s === "string"))
    return null;

  return {
    caption: o.caption.trim(),
    hashtags: o.hashtags.map((h) => h.trim()).filter(Boolean),
    bestTime: o.bestTime.trim(),
    suggestions: o.suggestions.map((s) => s.trim()).filter(Boolean),
  };
}

export class InstagramProviderError extends Error {
  name = "InstagramProviderError";
}

export class InstagramInvalidOutputError extends Error {
  name = "InstagramInvalidOutputError";
}

export async function generateInstagramContent(
  plannerOutput: PlannerOutput,
  settings: InstagramSettings
): Promise<InstagramResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new InstagramProviderError("Missing OPENAI_API_KEY");

  const systemPrompt =
    "You are an expert Instagram content strategist for creators and developers.";

  const toneInstructions =
    settings.tone === "casual"
      ? "Use warm, conversational language."
      : settings.tone === "storytelling"
        ? "Use a story arc (context, challenge, action, result)."
        : "Use polished, professional language.";

  const userPrompt = [
    "Generate Instagram-ready content from the planner output.",
    "",
    "Return ONLY valid JSON in this shape:",
    '{ "caption": "...", "hashtags": ["..."], "bestTime": "...", "suggestions": ["..."] }',
    "",
    "Constraints:",
    "- Caption should be engaging and easy to skim.",
    "- Keep caption around 80-220 words.",
    "- Include clear line breaks for readability.",
    "- Hashtags should be relevant (8-15).",
    "- bestTime should be short and practical.",
    "- suggestions should be actionable improvements (3-6).",
    "- Do not include markdown formatting.",
    toneInstructions,
    `Use emojis: ${settings.includeEmojis === false ? "No" : "Yes, sparingly"}.`,
    settings.audience ? `Audience: ${settings.audience}` : "",
    "",
    "Planner output:",
    JSON.stringify(plannerOutput),
  ]
    .filter(Boolean)
    .join("\n");

  const client = new OpenAI({ apiKey });
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch {
    throw new InstagramProviderError("Instagram generation provider failed.");
  }

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const result = normalizeResult(parsed);
  if (!result) {
    throw new InstagramInvalidOutputError("Instagram model returned invalid JSON output.");
  }
  return result;
}

