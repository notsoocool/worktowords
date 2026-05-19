import OpenAI from "openai";
import type { PlannerOutput } from "@/lib/ai/planner";

export type YouTubeTone = "casual" | "professional" | "storytelling";

export type YouTubeSettings = {
  tone: YouTubeTone;
  audience?: string;
  videoType?: "short" | "long";
};

export type YouTubeResult = {
  title: string;
  description: string;
  tags: string[];
  chapterIdeas: string[];
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

function normalizeResult(obj: unknown): YouTubeResult | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Partial<YouTubeResult>;
  if (!isNonEmptyString(o.title)) return null;
  if (!isNonEmptyString(o.description)) return null;
  if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === "string"))
    return null;
  if (
    !Array.isArray(o.chapterIdeas) ||
    !o.chapterIdeas.every((c) => typeof c === "string")
  )
    return null;
  if (!Array.isArray(o.suggestions) || !o.suggestions.every((s) => typeof s === "string"))
    return null;

  return {
    title: o.title.trim(),
    description: o.description.trim(),
    tags: o.tags.map((t) => t.trim()).filter(Boolean),
    chapterIdeas: o.chapterIdeas.map((c) => c.trim()).filter(Boolean),
    suggestions: o.suggestions.map((s) => s.trim()).filter(Boolean),
  };
}

export class YouTubeProviderError extends Error {
  name = "YouTubeProviderError";
}

export class YouTubeInvalidOutputError extends Error {
  name = "YouTubeInvalidOutputError";
}

export async function generateYouTubeContent(
  plannerOutput: PlannerOutput,
  settings: YouTubeSettings
): Promise<YouTubeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new YouTubeProviderError("Missing OPENAI_API_KEY");

  const systemPrompt =
    "You are an expert YouTube content strategist for creator and technical audiences.";

  const toneInstructions =
    settings.tone === "casual"
      ? "Use warm, conversational language."
      : settings.tone === "storytelling"
        ? "Use a narrative flow with tension and payoff."
        : "Use polished, professional language.";

  const userPrompt = [
    "Generate YouTube-ready content from planner output.",
    "",
    "Return ONLY valid JSON in this shape:",
    '{ "title": "...", "description": "...", "tags": ["..."], "chapterIdeas": ["..."], "suggestions": ["..."] }',
    "",
    "Constraints:",
    "- title: concise and clickable, 45-80 chars.",
    "- description: informative, skimmable, and CTA-ready.",
    "- tags: 8-15 relevant tags (no #).",
    "- chapterIdeas: 4-10 short section ideas.",
    "- suggestions: 3-6 actionable improvements.",
    "- Avoid markdown formatting.",
    toneInstructions,
    settings.audience ? `Audience: ${settings.audience}` : "",
    settings.videoType ? `Video type: ${settings.videoType}` : "",
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
    throw new YouTubeProviderError("YouTube generation provider failed.");
  }

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const result = normalizeResult(parsed);
  if (!result) {
    throw new YouTubeInvalidOutputError("YouTube model returned invalid JSON output.");
  }
  return result;
}

