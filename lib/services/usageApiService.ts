import { auth } from "@clerk/nextjs/server";
import { getUsageStatus } from "@/lib/services/usageService";

export async function getUsage() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const status = await getUsageStatus(userId);
    return Response.json(status);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load usage.";
    return Response.json({ error: message }, { status: 500 });
  }
}

