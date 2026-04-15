import { auth } from "@clerk/nextjs/server";
import { getUserSettings, updateUserSettings } from "@/lib/services/settingsService";
import { settingsPatchSchema } from "@/lib/utils/validators";

export async function getSettings() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const settings = await getUserSettings(userId);
    return Response.json({ defaultGoal: settings.goal, tone: settings.tone });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function patchSettings(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = settingsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Invalid body. Expected { defaultGoal: 'job'|'growth'|'authority', tone: 'casual'|'professional'|'storytelling' }",
      },
      { status: 400 }
    );
  }

  try {
    await updateUserSettings(userId, {
      goal: parsed.data.defaultGoal,
      tone: parsed.data.tone,
    });
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save settings.";
    const status = message.startsWith("Invalid body.") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}

