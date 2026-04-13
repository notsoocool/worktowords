import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type GenerateBody = {
  userInput: string;
  mode: "help" | "write";
  goal: "job" | "growth" | "authority";
};
type Tone = "casual" | "professional" | "storytelling";

type GenerateResult = {
  post: string;
  hashtags: string[];
  bestTime: string;
  suggestions: string[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isMode(v: unknown): v is GenerateBody["mode"] {
  return v === "help" || v === "write";
}

function isGoal(v: unknown): v is GenerateBody["goal"] {
  return v === "job" || v === "growth" || v === "authority";
}

function isTone(v: unknown): v is Tone {
  return v === "casual" || v === "professional" || v === "storytelling";
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeResult(obj: unknown): GenerateResult | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Partial<GenerateResult>;

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
    post: o.post.trim(),
    hashtags: o.hashtags.map((h) => h.trim()).filter(Boolean),
    bestTime: o.bestTime.trim(),
    suggestions: o.suggestions.map((s) => s.trim()).filter(Boolean),
  };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return Response.json(
      {
        error:
          "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 500 }
    );
  }

  const rawBody = await req.json().catch(() => null);
  const body = rawBody as Partial<GenerateBody> | null;

  if (!body || !isNonEmptyString(body.userInput) || !isMode(body.mode) || !isGoal(body.goal)) {
    return Response.json(
      {
        error:
          "Invalid body. Expected { userInput: string, mode: 'help'|'write', goal: 'job'|'growth'|'authority' }",
      },
      { status: 400 }
    );
  }

  // Daily usage limits (atomic check + increment).
  const { data: usageRows, error: usageError } = await supabase.rpc(
    "check_and_increment_usage",
    { p_user_id: userId }
  );

  if (usageError) {
    return Response.json(
      { error: `Usage limit check failed: ${usageError.message}` },
      { status: 500 }
    );
  }

  const usage = Array.isArray(usageRows) ? usageRows[0] : usageRows;
  if (usage && usage.allowed === false) {
    return Response.json(
      {
        error: "LIMIT_REACHED",
        message: "You've reached your free daily limit.",
      },
      { status: 429 }
    );
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_goal, tone")
    .eq("user_id", userId)
    .maybeSingle();

  const effectiveGoal = isGoal(settings?.default_goal) ? settings.default_goal : body.goal;
  const tone: Tone = isTone(settings?.tone) ? settings.tone : "professional";

  const systemPrompt =
    "You are an expert LinkedIn content strategist for developers.";

  const modeInstructions =
    body.mode === "help"
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
    tone === "casual"
      ? [
          "Tone: CASUAL.",
          "- Use warm, conversational language.",
          "- Keep it natural and easy to read.",
        ]
      : tone === "storytelling"
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
    "- Keep hashtags relevant (5–10).",
    "- bestTime should be a short recommendation (e.g. 'Tue–Thu 8–10am local').",
    "- suggestions should be actionable improvements (3–6).",
    "- Output should sound like a real developer sharing real work, not marketing fluff.",
    "",
    `mode: ${body.mode}`,
    `goal: ${effectiveGoal}`,
    `tone: ${tone}`,
    "",
    "userInput:",
    body.userInput.trim(),
  ].join("\n");

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const result = normalizeResult(parsed);

  if (!result) {
    return Response.json(
      {
        error: "Model returned invalid JSON output.",
        raw: content,
      },
      { status: 502 }
    );
  }

  const { error: insertError } = await supabase.from("posts").insert({
    user_id: userId,
    content: result.post,
    hashtags: result.hashtags,
    goal: effectiveGoal,
  });

  if (insertError) {
    return Response.json(
      { error: `Failed to save post: ${insertError.message}` },
      { status: 500 }
    );
  }

  return Response.json(result);
}

