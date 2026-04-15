export type GenerationMode = "help" | "write";
export type GenerationGoal = "job" | "growth" | "authority";
export type GenerationPlatform = "linkedin" | "instagram" | "youtube";

export type GenerateRequest = {
  userId: string;
  userInput: string;
  mode: GenerationMode;
  goal: GenerationGoal;
  tone: "casual" | "professional" | "storytelling";
  apiKey: string;
  ip?: string | null;
  requestId?: string | null;
};

export type GenerateResult = {
  post: string;
  hashtags: string[];
  bestTime: string;
  suggestions: string[];
};

export type GenerateContentRequest = {
  userId: string;
  userInput: string;
  mode: GenerationMode;
  goal: GenerationGoal;
  platforms: string[];
};

export type MultiPlatformContent = {
  post?: string;
  linkedin?: string;
  instagram?: {
    caption: string;
    hashtags: string[];
    bestTime: string;
    suggestions: string[];
  };
  youtube?: {
    title: string;
    description: string;
    tags: string[];
    chapterIdeas: string[];
    suggestions: string[];
  };
  hashtags: string[];
  bestTime: string;
  suggestions: string[];
};

export class GenerationProviderError extends Error {
  name = "GenerationProviderError";
}

export class GenerationInvalidOutputError extends Error {
  name = "GenerationInvalidOutputError";
}

function normalizePlatforms(platforms: string[]): GenerationPlatform[] {
  const normalized = platforms.map((p) => p.trim().toLowerCase());
  const unique = [...new Set(normalized)];
  const valid: GenerationPlatform[] = [];
  for (const p of unique) {
    if (p === "linkedin" || p === "instagram" || p === "youtube") {
      valid.push(p);
    }
  }
  return valid;
}

function toHashtag(raw: string) {
  const clean = raw
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9_]/g, "");
  return clean ? `#${clean}` : "";
}

function dedupeHashtags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const normalized = toHashtag(tag);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function keywordHashtagsFromInput(input: string) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "into",
    "your",
    "you",
    "our",
    "are",
    "was",
    "were",
    "have",
    "has",
    "had",
    "about",
  ]);
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !stop.has(w))
    )
  )
    .slice(0, 8)
    .map((w) => `#${w}`);
}

function buildBestTime(platforms: GenerationPlatform[]) {
  const pieces: string[] = [];
  if (platforms.includes("linkedin")) pieces.push("LinkedIn: Tue-Thu 8-10am local");
  if (platforms.includes("instagram")) pieces.push("Instagram: Mon-Fri 11am-1pm or 7-9pm local");
  if (platforms.includes("youtube")) pieces.push("YouTube: Thu-Sun 5-8pm local");
  return pieces.length <= 1 ? pieces[0] ?? "Tue-Thu 8-10am local" : pieces.join(" | ");
}

function buildSuggestions(req: GenerateContentRequest, platforms: GenerationPlatform[]) {
  const out: string[] = [];
  out.push(req.mode === "help" ? "Keep your voice but tighten the first 2 lines." : "Open with the strongest outcome in the first 2 lines.");
  out.push(
    req.goal === "job"
      ? "Add 1-2 measurable outcomes to strengthen hiring signal."
      : req.goal === "growth"
        ? "End with a clear engagement question to boost comments."
        : "Add one contrarian insight or trade-off to increase authority."
  );
  if (platforms.includes("instagram")) {
    out.push("Use shorter caption paragraphs (1-2 lines) for mobile readability.");
  }
  if (platforms.includes("youtube")) {
    out.push("Make the first 10 seconds hook explicit in title + opening script.");
  }
  out.push("A/B test hook variants from the planner hooks list.");
  return out.slice(0, 5);
}

function applyOptimizationLayer(
  req: GenerateContentRequest,
  platforms: GenerationPlatform[],
  combined: Omit<MultiPlatformContent, "hashtags" | "bestTime" | "suggestions">
): MultiPlatformContent {
  const instagramTags = combined.instagram?.hashtags ?? [];
  const youtubeTags = (combined.youtube?.tags ?? []).map((t) => `#${t}`);
  const keywordTags = keywordHashtagsFromInput(req.userInput);
  const hashtags = dedupeHashtags([...instagramTags, ...youtubeTags, ...keywordTags]).slice(0, 12);

  const post =
    combined.linkedin ??
    combined.instagram?.caption ??
    [combined.youtube?.title, combined.youtube?.description].filter(Boolean).join("\n\n");

  return {
    ...combined,
    post,
    hashtags,
    bestTime: buildBestTime(platforms),
    suggestions: buildSuggestions(req, platforms),
  };
}

export async function generateContent(req: GenerateContentRequest): Promise<MultiPlatformContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new GenerationProviderError("Missing OPENAI_API_KEY");

  const platforms = normalizePlatforms(req.platforms);
  if (platforms.length === 0) {
    throw new GenerationInvalidOutputError("At least one valid platform is required.");
  }

  const {
    planContent,
    PlannerInvalidOutputError,
    PlannerProviderError,
  } = await import("@/lib/ai/planner");
  const { generateLinkedInPost, LinkedInInvalidOutputError, LinkedInProviderError } =
    await import("@/lib/ai/linkedin");
  const { generateInstagramContent, InstagramInvalidOutputError, InstagramProviderError } =
    await import("@/lib/ai/instagram");
  const { generateYouTubeContent, YouTubeInvalidOutputError, YouTubeProviderError } =
    await import("@/lib/ai/youtube");

  try {
    const planner = await planContent(req.userInput, apiKey);

    const tasks: Promise<[GenerationPlatform, unknown]>[] = [];

    if (platforms.includes("linkedin")) {
      tasks.push(
        generateLinkedInPost(
          req.userInput,
          {
            mode: req.mode,
            goal: req.goal,
            tone: "professional",
          },
          apiKey
        ).then((result) => ["linkedin", result.post])
      );
    }

    if (platforms.includes("instagram")) {
      tasks.push(
        generateInstagramContent(planner, {
          tone: "professional",
          audience: req.goal,
          includeEmojis: true,
        }).then((result) => ["instagram", result])
      );
    }

    if (platforms.includes("youtube")) {
      tasks.push(
        generateYouTubeContent(planner, {
          tone: "professional",
          audience: req.goal,
          videoType: req.mode === "write" ? "long" : "short",
        }).then((result) => ["youtube", result])
      );
    }

    const resolved = await Promise.all(tasks);
    const combined: Omit<MultiPlatformContent, "hashtags" | "bestTime" | "suggestions"> = {};
    for (const [platform, result] of resolved) {
      if (platform === "linkedin") combined.linkedin = result as string;
      if (platform === "instagram") combined.instagram = result as MultiPlatformContent["instagram"];
      if (platform === "youtube") combined.youtube = result as MultiPlatformContent["youtube"];
    }

    return applyOptimizationLayer(req, platforms, combined);
  } catch (e) {
    if (e instanceof PlannerProviderError) {
      throw new GenerationProviderError(e.message);
    }
    if (e instanceof PlannerInvalidOutputError) {
      throw new GenerationInvalidOutputError(e.message);
    }
    if (e instanceof LinkedInProviderError) {
      throw new GenerationProviderError(e.message);
    }
    if (e instanceof LinkedInInvalidOutputError) {
      throw new GenerationInvalidOutputError(e.message);
    }
    if (e instanceof InstagramProviderError) {
      throw new GenerationProviderError(e.message);
    }
    if (e instanceof InstagramInvalidOutputError) {
      throw new GenerationInvalidOutputError(e.message);
    }
    if (e instanceof YouTubeProviderError) {
      throw new GenerationProviderError(e.message);
    }
    if (e instanceof YouTubeInvalidOutputError) {
      throw new GenerationInvalidOutputError(e.message);
    }
    throw e;
  }
}

// Backwards-compatible alias (kept for now).
export async function generatePost(req: GenerateRequest): Promise<GenerateResult> {
  const {
    planContent,
    PlannerInvalidOutputError,
    PlannerProviderError,
  } = await import("@/lib/ai/planner");
  const {
    generateLinkedInPost,
    LinkedInInvalidOutputError,
    LinkedInProviderError,
  } = await import("@/lib/ai/linkedin");

  try {
    await planContent(req.userInput, req.apiKey);
    return await generateLinkedInPost(
      req.userInput,
      { mode: req.mode, goal: req.goal, tone: req.tone ?? "professional" },
      req.apiKey
    );
  } catch (e) {
    if (e instanceof PlannerProviderError || e instanceof LinkedInProviderError) {
      throw new GenerationProviderError(e.message);
    }
    if (
      e instanceof PlannerInvalidOutputError ||
      e instanceof LinkedInInvalidOutputError
    ) {
      throw new GenerationInvalidOutputError(e.message);
    }
    throw e;
  }
}

