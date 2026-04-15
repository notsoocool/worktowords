import OpenAI from "openai";

export type PlannerOutput = {
  topic: string;
  problem: string;
  insight: string;
  angles: string[];
  hooks: string[];
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

function normalizePlan(obj: unknown): PlannerOutput | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Partial<PlannerOutput>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : null);

  if (!isNonEmptyString(o.topic)) return null;
  if (!isNonEmptyString(o.problem)) return null;
  if (!isNonEmptyString(o.insight)) return null;
  const angles = arr(o.angles);
  const hooks = arr(o.hooks);
  if (!angles || !hooks) return null;

  return {
    topic: o.topic.trim(),
    problem: o.problem.trim(),
    insight: o.insight.trim(),
    angles: angles.map((s) => s.trim()).filter(Boolean).slice(0, 8),
    hooks: hooks.map((s) => s.trim()).filter(Boolean).slice(0, 8),
  };
}

export class PlannerProviderError extends Error {
  name = "PlannerProviderError";
}

export class PlannerInvalidOutputError extends Error {
  name = "PlannerInvalidOutputError";
}

export async function planContent(input: string, apiKey: string): Promise<PlannerOutput> {
  const client = new OpenAI({ apiKey });
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert cross-platform content strategist for creators and developers. Produce structured planning output only.",
        },
        {
          role: "user",
          content: [
            "Create a concise cross-platform content plan based on this raw input.",
            "Generate hooks and angles that can work across LinkedIn, Instagram, and YouTube.",
            "Return ONLY valid JSON matching:",
            '{ "topic": "...", "problem": "...", "insight": "...", "angles": ["..."], "hooks": ["..."] }',
            "",
            "Constraints:",
            "- topic: short and specific",
            "- problem: concrete pain point in 1 sentence",
            "- insight: strongest takeaway in 1-2 sentences",
            "- angles: 4-8 distinct storytelling/positioning angles",
            "- hooks: 4-8 compelling opening lines",
            "",
            `input: ${input}`,
          ].join("\n"),
        },
      ],
    });
  } catch {
    throw new PlannerProviderError("Planner provider failed.");
  }

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const normalized = normalizePlan(parsed);
  if (!normalized) throw new PlannerInvalidOutputError("Planner returned invalid JSON output.");
  return normalized;
}

