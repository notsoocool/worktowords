import { auth } from "@clerk/nextjs/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  clientIpFrom,
  logSecurityInfo,
  logSecurityWarn,
  requestIdFrom,
} from "@/lib/security";
import { checkAndUpdateUsage } from "@/lib/services/usageService";
import { getUserSettingsForGeneration } from "@/lib/services/settingsService";
import {
  savePost,
  type InstagramPost,
  type PostType,
  type YouTubePost,
} from "@/lib/services/postService";
import {
  GenerationInvalidOutputError,
  GenerationProviderError,
  MultiPlatformContent,
  GenerationPlatform,
  generateContent,
} from "@/lib/services/generationService";
import {
  generateBodySchema,
  MAX_GENERATE_INPUT_CHARS,
} from "@/lib/utils/validators";

const GENERATE_LIMIT = 12;
const GENERATE_WINDOW_MS = 60_000;

function toCanonicalHashtags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim();
    if (!t) continue;
    const normalized = t.startsWith("#") ? t : `#${t}`;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function buildPostToPersist(
  result: MultiPlatformContent,
  requestedPlatforms: string[]
): {
  type: PostType;
  linkedin: string | null;
  instagram: InstagramPost | null;
  youtube: YouTubePost | null;
  content: string;
  hashtags: string[];
} {
  const ordered = requestedPlatforms.map((p) => p.trim().toLowerCase());
  const platforms: GenerationPlatform[] = [];
  for (const p of ordered) {
    if (
      (p === "linkedin" || p === "instagram" || p === "youtube") &&
      !platforms.includes(p)
    ) {
      platforms.push(p);
    }
  }
  if (platforms.length === 0) platforms.push("linkedin");

  let linkedin: string | null = null;
  let instagram: InstagramPost | null = null;
  let youtube: YouTubePost | null = null;

  if (result.linkedin) linkedin = result.linkedin;
  if (result.instagram) {
    instagram = {
      reelIdea: result.instagram.suggestions[0] ?? "Hook the viewer with a concrete outcome.",
      caption: result.instagram.caption,
      script: result.instagram.caption,
    };
  }
  if (result.youtube) {
    youtube = {
      title: result.youtube.title,
      hook:
        result.youtube.chapterIdeas[0] ??
        result.youtube.suggestions[0] ??
        "Start with the most surprising insight.",
      script: result.youtube.description,
    };
  }

  for (const platform of platforms) {
    if (platform === "linkedin" && result.linkedin) {
      return {
        type: platforms.length > 1 ? "multi" : "single",
        linkedin,
        instagram,
        youtube,
        content: result.linkedin,
        hashtags: [],
      };
    }
    if (platform === "instagram" && result.instagram) {
      return {
        type: platforms.length > 1 ? "multi" : "single",
        linkedin,
        instagram,
        youtube,
        content: result.instagram.caption,
        hashtags: toCanonicalHashtags(result.instagram.hashtags),
      };
    }
    if (platform === "youtube" && result.youtube) {
      return {
        type: platforms.length > 1 ? "multi" : "single",
        linkedin,
        instagram,
        youtube,
        content: `${result.youtube.title}\n\n${result.youtube.description}`.trim(),
        hashtags: toCanonicalHashtags(result.youtube.tags),
      };
    }
  }

  return {
    type: platforms.length > 1 ? "multi" : "single",
    linkedin,
    instagram,
    youtube,
    content: linkedin ?? instagram?.caption ?? [youtube?.title, youtube?.script].filter(Boolean).join("\n\n"),
    hashtags: [],
  };
}

export async function postGenerate(req: Request) {
  const requestId = requestIdFrom(req);
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }
  const ip = clientIpFrom(req);
  const ctx = { requestId, route: "/api/generate", userId, ip };

  const limit = consumeRateLimit(
    `generate:${userId}:${ip}`,
    GENERATE_LIMIT,
    GENERATE_WINDOW_MS
  );
  if (!limit.allowed) {
    logSecurityWarn("rate_limit_exceeded", ctx, {
      bucket: "generate",
      limit: limit.limit,
      windowMs: GENERATE_WINDOW_MS,
    });
    return Response.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
          "x-request-id": requestId,
        },
      }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = generateBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const status =
      issue?.path?.[0] === "userInput" && issue.code === "too_big" ? 413 : 400;
    const error =
      status === 413
        ? `Input too long. Maximum ${MAX_GENERATE_INPUT_CHARS} characters.`
        : "Invalid body. Expected { userInput: string, mode: 'help'|'write', goal: 'job'|'growth'|'authority', platforms: string[] }";
    return Response.json(
      { error },
      { status, headers: { "x-request-id": requestId } }
    );
  }

  try {
    const usage = await checkAndUpdateUsage(userId);
    if (!usage.allowed) {
      return Response.json(
        { error: "LIMIT_REACHED", message: "You've reached your free daily limit." },
        { status: 429, headers: { "x-request-id": requestId } }
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Usage limit check failed.";
    return Response.json(
      { error: `Usage limit check failed: ${message}` },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const settings = await getUserSettingsForGeneration(userId);
  const effectiveGoal = settings.goal ?? parsed.data.goal;

  let result;
  try {
    result = await generateContent({
      userId,
      userInput: parsed.data.userInput,
      mode: parsed.data.mode,
      goal: effectiveGoal,
      platforms: parsed.data.platforms,
    });
  } catch (e) {
    if (e instanceof GenerationProviderError) {
      logSecurityWarn("provider_error", ctx, { provider: "openai" });
      return Response.json(
        { error: "Generation provider failed. Please try again." },
        { status: 502, headers: { "x-request-id": requestId } }
      );
    }
    if (e instanceof GenerationInvalidOutputError) {
      return Response.json(
        { error: "Model returned invalid JSON output." },
        { status: 502, headers: { "x-request-id": requestId } }
      );
    }
    throw e;
  }

  try {
    const persisted = buildPostToPersist(result, parsed.data.platforms);
    await savePost(userId, {
      type: persisted.type,
      linkedin: persisted.linkedin,
      instagram: persisted.instagram,
      youtube: persisted.youtube,
      content: persisted.content,
      hashtags: persisted.hashtags,
      goal: effectiveGoal,
    });
  } catch (e) {
    logSecurityWarn("db_write_failed", ctx, { table: "posts" });
    const message = e instanceof Error ? e.message : "Failed to save post.";
    return Response.json(
      { error: `Failed to save post: ${message}` },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  logSecurityInfo("generate_success", ctx, {
    mode: parsed.data.mode,
    goal: effectiveGoal,
    platforms: parsed.data.platforms,
  });
  return Response.json(result, { headers: { "x-request-id": requestId } });
}

