import { auth } from "@clerk/nextjs/server";
import { getPostById, getPosts } from "@/lib/services/postService";

export async function getPostsList(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const goalParam = new URL(req.url).searchParams.get("goal") ?? undefined;
  try {
    const posts = await getPosts(userId, goalParam);
    return Response.json({ posts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load history.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function getPost(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const post = await getPostById(userId, id);
    if (!post) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ post });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load post.";
    return Response.json({ error: message }, { status: 500 });
  }
}

