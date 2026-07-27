"use client";

import * as React from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Goal = "job" | "growth" | "authority";
type Tone = "casual" | "professional" | "storytelling";

export function SettingsForm() {
  const [defaultGoal, setDefaultGoal] = React.useState<Goal>("growth");
  const [tone, setTone] = React.useState<Tone>("professional");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { method: "GET" });
        const data = (await res.json().catch(() => null)) as
          | { defaultGoal?: Goal; tone?: Tone; error?: string }
          | null;
        if (!res.ok) throw new Error(data?.error || "Failed to load settings.");
        if (cancelled) return;
        setDefaultGoal(data?.defaultGoal ?? "growth");
        setTone(data?.tone ?? "professional");
        setLoaded(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load settings.";
        toast.error(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(nextGoal: Goal, nextTone: Tone) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultGoal: nextGoal, tone: nextTone }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error || "Failed to save settings.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save settings.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function onGoalChange(value: Goal) {
    setDefaultGoal(value);
    void save(value, tone);
  }

  function onToneChange(value: Tone) {
    setTone(value);
    void save(defaultGoal, value);
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Delete your account and all saved posts, settings, usage, and subscription data? This cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Failed to delete account.");
      window.location.assign("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete account.";
      toast.error(msg);
      setDeleting(false);
    }
  }

  return (
    <div className="saas-card p-6 sm:p-8">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          {!loaded ? "Loading…" : saving ? "Saving…" : "Saved automatically"}
        </p>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Defaults apply to new generations on the dashboard.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="default-goal">Default goal</Label>
          <Select
            value={defaultGoal}
            onValueChange={(v) => onGoalChange(v as Goal)}
            disabled={!loaded}
          >
            <SelectTrigger id="default-goal" className="w-full justify-between">
              <SelectValue placeholder="Select default goal" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="job">Get a Job</SelectItem>
              <SelectItem value="growth">Grow on LinkedIn</SelectItem>
              <SelectItem value="authority">Build Authority</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="writing-tone">Writing tone</Label>
          <Select
            value={tone}
            onValueChange={(v) => onToneChange(v as Tone)}
            disabled={!loaded}
          >
            <SelectTrigger id="writing-tone" className="w-full justify-between">
              <SelectValue placeholder="Select writing tone" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="casual">casual</SelectItem>
              <SelectItem value="professional">professional</SelectItem>
              <SelectItem value="storytelling">storytelling</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-8 border-t border-border/60 pt-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-destructive">Delete account</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Permanently remove your account and all saved WorktoWords data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void deleteAccount()}
            disabled={deleting || saving}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-destructive/40 px-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
