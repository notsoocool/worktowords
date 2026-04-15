export type PostGoal = "job" | "growth" | "authority";
export type PostType = "single" | "multi";

export type InstagramPost = {
  reelIdea: string;
  caption: string;
  script: string;
};

export type YouTubePost = {
  title: string;
  hook: string;
  script: string;
};

export type HistoryPost = {
  id: string | number;
  content: string;
  hashtags: string[];
  goal: PostGoal;
  type?: PostType;
  linkedin?: string | null;
  instagram?: InstagramPost | null;
  youtube?: YouTubePost | null;
  created_at: string;
};

export type SavePostData = {
  goal: PostGoal;
  type: PostType;
  linkedin: string | null;
  instagram: InstagramPost | null;
  youtube: YouTubePost | null;
  content?: string;
  hashtags?: string[];
};

type OptionalPostsColumn = "type" | "linkedin" | "instagram" | "youtube";
const OPTIONAL_POSTS_COLUMNS: OptionalPostsColumn[] = [
  "type",
  "linkedin",
  "instagram",
  "youtube",
];

function parseMissingPostsColumn(message: string): OptionalPostsColumn | null {
  const msg = message || "";

  for (const col of OPTIONAL_POSTS_COLUMNS) {
    if (
      msg.includes(`Could not find the '${col}' column`) ||
      msg.includes(`column posts.${col} does not exist`)
    ) {
      return col;
    }
  }

  return null;
}

function toHistoryPost(row: {
  id: string | number;
  content?: string | null;
  hashtags?: string[] | null;
  goal: unknown;
  type?: unknown;
  linkedin?: unknown;
  instagram?: unknown;
  youtube?: unknown;
  created_at: string;
}): HistoryPost {
  const instagram =
    row.instagram && typeof row.instagram === "object"
      ? (row.instagram as InstagramPost)
      : null;
  const youtube =
    row.youtube && typeof row.youtube === "object"
      ? (row.youtube as YouTubePost)
      : null;
  const linkedin = typeof row.linkedin === "string" ? row.linkedin : null;

  const content =
    (typeof row.content === "string" && row.content.trim()) ||
    linkedin ||
    instagram?.caption ||
    [youtube?.title, youtube?.script].filter(Boolean).join("\n\n") ||
    "";

  return {
    id: row.id,
    content,
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    goal: isGoal(row.goal) ? row.goal : "growth",
    type: row.type === "multi" ? "multi" : "single",
    linkedin,
    instagram,
    youtube,
    created_at: row.created_at,
  };
}

function isGoal(v: unknown): v is PostGoal {
  return v === "job" || v === "growth" || v === "authority";
}

function normalizeGoal(goal?: string): PostGoal | undefined {
  if (!goal) return undefined;
  return isGoal(goal) ? goal : undefined;
}

export async function savePost(
  userId: string,
  data: SavePostData
): Promise<void> {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const fallbackContent =
    data.content?.trim() ||
    data.linkedin?.trim() ||
    data.instagram?.caption?.trim() ||
    [data.youtube?.title?.trim(), data.youtube?.script?.trim()]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  const content = fallbackContent || "Generated content";
  const hashtags = Array.isArray(data.hashtags) ? data.hashtags : [];

  const fullInsert = {
    user_id: userId,
    content,
    hashtags,
    goal: data.goal,
    type: data.type,
    linkedin: data.linkedin,
    instagram: data.instagram,
    youtube: data.youtube,
  } as const;

  const insertPayload: Record<string, unknown> = { ...fullInsert };

  for (let i = 0; i <= OPTIONAL_POSTS_COLUMNS.length; i += 1) {
    const { error } = await supabase.from("posts").insert(insertPayload);
    if (!error) return;

    const missing = parseMissingPostsColumn(error.message);
    if (!missing || !(missing in insertPayload)) throw new Error(error.message);

    // Retry while dropping only missing optional columns so other
    // multi-platform fields can still be persisted.
    delete insertPayload[missing];
  }

  throw new Error("Failed to save post.");
}

export async function getPosts(
  userId: string,
  goal?: string
): Promise<HistoryPost[]> {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const normalizedGoal = normalizeGoal(goal);
  let columns = [
    "id",
    "content",
    "hashtags",
    "goal",
    "type",
    "linkedin",
    "instagram",
    "youtube",
    "created_at",
  ];

  for (let i = 0; i <= OPTIONAL_POSTS_COLUMNS.length; i += 1) {
    let qb = supabase.from("posts").select(columns.join(", ")).eq("user_id", userId);
    if (normalizedGoal) qb = qb.eq("goal", normalizedGoal);
    const { data, error } = await qb.order("created_at", { ascending: false }).limit(100);

    if (!error) {
      const rows = ((data ?? []) as unknown) as Array<{
        id: string | number;
        content?: string | null;
        hashtags?: string[] | null;
        goal: unknown;
        type?: unknown;
        linkedin?: unknown;
        instagram?: unknown;
        youtube?: unknown;
        created_at: string;
      }>;
      return rows.map((row) => toHistoryPost(row));
    }

    const missing = parseMissingPostsColumn(error.message);
    if (!missing || !columns.includes(missing)) throw new Error(error.message);
    columns = columns.filter((c) => c !== missing);
  }

  throw new Error("Failed to load history.");
}

export async function getPostById(
  userId: string,
  postId: string
): Promise<HistoryPost | null> {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  let columns = [
    "id",
    "content",
    "hashtags",
    "goal",
    "type",
    "linkedin",
    "instagram",
    "youtube",
    "created_at",
  ];

  for (let i = 0; i <= OPTIONAL_POSTS_COLUMNS.length; i += 1) {
    const { data, error } = await supabase
      .from("posts")
      .select(columns.join(", "))
      .eq("user_id", userId)
      .eq("id", postId)
      .maybeSingle();

    if (!error) {
      if (!data) return null;
      const row = (data as unknown) as {
        id: string | number;
        content?: string | null;
        hashtags?: string[] | null;
        goal: unknown;
        type?: unknown;
        linkedin?: unknown;
        instagram?: unknown;
        youtube?: unknown;
        created_at: string;
      };
      return toHistoryPost(row);
    }

    const missing = parseMissingPostsColumn(error.message);
    if (!missing || !columns.includes(missing)) throw new Error(error.message);
    columns = columns.filter((c) => c !== missing);
  }

  throw new Error("Failed to load post.");
}

