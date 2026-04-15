import OpenAI from "openai";

export type LinkedInMode = "help" | "write";
export type LinkedInGoal = "job" | "growth" | "authority";
export type LinkedInTone = "casual" | "professional" | "storytelling";

export type LinkedInSettings = {
  mode: LinkedInMode;
  goal: LinkedInGoal;
  tone: LinkedInTone;
};

export type LinkedInResult = {
  post: string;
  hashtags: string[];
  bestTime: string;
  suggestions: string[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sanitizePostText(text: string) {
  // Sometimes the model accidentally appends metadata sections into `post`.
  // Keep only the actual LinkedIn post body.
  const patterns = [
    /^\s*📅\s*best time to post\b[\s\S]*$/im,
    /^\s*best time to post\b[\s\S]*$/im,
    /^\s*🔧\s*suggestions\b[\s\S]*$/im,
    /^\s*suggestions for improvement\b[\s\S]*$/im,
    /^\s*suggestions\b[\s\S]*$/im,
  ];
  let out = text;
  for (const re of patterns) out = out.replace(re, "").trimEnd();
  return toLinkedInPlainText(stripTrailingHashtagBlock(out.trim()));
}

function extractHashtags(text: string) {
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return matches.map((h) => h.trim());
}

function dedupeHashtags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const normalized = tag.startsWith("#") ? tag : `#${tag}`;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function isHashtagOnlyLine(line: string) {
  const tokens = line
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => /^#[\p{L}\p{N}_-]+$/u.test(token));
}

function stripTrailingHashtagBlock(text: string) {
  const lines = text.split("\n");
  let i = lines.length - 1;

  // Ignore trailing empty lines first.
  while (i >= 0 && lines[i].trim() === "") i -= 1;
  if (i < 0) return "";

  // If the tail is hashtag-only lines, remove the full tail block.
  if (!isHashtagOnlyLine(lines[i])) return text;

  while (i >= 0) {
    const line = lines[i];
    if (line.trim() === "" || isHashtagOnlyLine(line)) {
      i -= 1;
      continue;
    }
    break;
  }

  return lines.slice(0, i + 1).join("\n").trimEnd();
}

function toUnicodeBold(input: string) {
  const mapChar = (ch: string) => {
    const code = ch.codePointAt(0) ?? 0;
    // A-Z
    if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(0x1d400 + (code - 0x41));
    // a-z
    if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(0x1d41a + (code - 0x61));
    // 0-9
    if (code >= 0x30 && code <= 0x39) return String.fromCodePoint(0x1d7ce + (code - 0x30));
    return ch;
  };
  return Array.from(input).map(mapChar).join("");
}

function toLinkedInPlainText(text: string) {
  // Keep structure exactly as generated; only convert explicit **...** emphasis.
  // This avoids breaking bullets/spacing.
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, (_m, inner: string) => toUnicodeBold(inner))
    .trim();
}

function normalizeResult(obj: unknown): LinkedInResult | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Partial<LinkedInResult>;

  if (!isNonEmptyString(o.post)) return null;
  if (!Array.isArray(o.hashtags) || !o.hashtags.every((t) => typeof t === "string"))
    return null;
  if (!isNonEmptyString(o.bestTime)) return null;
  if (
    !Array.isArray(o.suggestions) ||
    !o.suggestions.every((t) => typeof t === "string")
  )
    return null;

  return {
    post: sanitizePostText(o.post),
    hashtags: dedupeHashtags([
      ...o.hashtags.map((h) => h.trim()).filter(Boolean),
      ...extractHashtags(o.post),
    ]),
    bestTime: o.bestTime.trim(),
    suggestions: o.suggestions.map((s) => s.trim()).filter(Boolean),
  };
}

export class LinkedInProviderError extends Error {
  name = "LinkedInProviderError";
}

export class LinkedInInvalidOutputError extends Error {
  name = "LinkedInInvalidOutputError";
}

export async function generateLinkedInPost(
  input: string,
  settings: LinkedInSettings,
  apiKey: string
): Promise<LinkedInResult> {
  const systemPrompt = "You are an expert LinkedIn content strategist for developers.";

  const modeInstructions =
    settings.mode === "help"
      ? [
          "Mode behavior: HELP_ME_WRITE (editor mode).",
          "- Keep the user's voice, style, and core wording wherever possible.",
          "- Do NOT fully rewrite from scratch.",
          "- Improve clarity, flow, grammar, and structure.",
          "- Preserve concrete details (tools, metrics, outcomes, examples).",
          "- Keep it natural and human; avoid generic AI-sounding phrases.",
          "- Make it LinkedIn-ready with a clear hook, body, and close.",
        ]
      : [
          "Mode behavior: WRITE_FOR_ME (ghostwriter mode).",
          "- You may rewrite from scratch using the user's input as source context.",
          "- Produce a polished, complete LinkedIn post with strong narrative flow.",
          "- Prioritize readability, impact, and engagement.",
        ];

  const toneInstructions =
    settings.tone === "casual"
      ? [
          "Tone: CASUAL.",
          "- Use warm, conversational language.",
          "- Keep it natural and easy to read.",
        ]
      : settings.tone === "storytelling"
        ? [
            "Tone: STORYTELLING.",
            "- Frame as a mini-story: context, challenge, action, result.",
            "- Keep it vivid but concise.",
          ]
        : [
            "Tone: PROFESSIONAL.",
            "- Keep language clear, polished, and credible.",
            "- Avoid slang and overhype.",
          ];

  const userPrompt = [
    "Transform the user's raw input into a clean, high-quality LinkedIn post.",
    "",
    "Adapt based on mode and goal.",
    ...modeInstructions,
    "",
    ...toneInstructions,
    "",
    "Goal behavior:",
    "- job → highlight skills, measurable impact, scope, and outcomes.",
    "- growth → add a strong hook, scannable formatting, and engagement prompts.",
    "- authority → add deeper insights, trade-offs, lessons learned, and credibility.",
    "",
    "Return ONLY valid JSON matching this shape:",
    '{ "post": "...", "hashtags": ["..."], "bestTime": "...", "suggestions": ["..."] }',
    "",
    "Constraints:",
    "- The `post` field must contain ONLY the LinkedIn post text. Do NOT include bestTime or suggestions inside `post`.",
    "- Do NOT include hashtags inside the `post` field; return hashtags only in the `hashtags` array.",
    "- Do NOT use Markdown formatting (no **bold**, no *italics*, no headings). If emphasis is needed, use plain text or Unicode bold characters.",
    "- Emojis are allowed (use sparingly, 0–6) to improve readability.",
    "- Keep hashtags relevant (5–10).",
    "- bestTime should be a short recommendation (e.g. 'Tue–Thu 8–10am local').",
    "- suggestions should be actionable improvements (3–6).",
    "- Output should sound like a real developer sharing real work, not marketing fluff.",
    "",
    `mode: ${settings.mode}`,
    `goal: ${settings.goal}`,
    `tone: ${settings.tone}`,
    "",
    "User input:",
    input,
  ].join("\n");

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
    throw new LinkedInProviderError("Generation provider failed.");
  }

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const result = normalizeResult(parsed);
  if (!result) throw new LinkedInInvalidOutputError("Model returned invalid JSON output.");
  return result;
}

