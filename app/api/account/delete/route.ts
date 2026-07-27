import { auth } from "@clerk/nextjs/server";

import { deleteAccountData } from "@/lib/services/accountDeletionService";

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteAccountData(userId);
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete account.";
    return Response.json({ error: message }, { status: 500 });
  }
}
