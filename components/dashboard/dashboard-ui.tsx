"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "help" | "auto";
type Goal = "job" | "growth" | "authority";
type Tone = "casual" | "professional" | "storytelling";

type GenerateResponse = {
  post: string;
  hashtags: string[];
  bestTime: string;
  suggestions: string[];
};

type HistoryPost = {
  id: string | number;
  content: string;
  hashtags: string[];
  created_at: string;
};

function buildLiveToastSteps({
  input,
  mode,
  goal,
}: {
  input: string;
  mode: Mode;
  goal: Goal;
}) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  const preview = cleaned.slice(0, 70);
  const rawWords = input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  const uniqueWords = [...new Set(rawWords)].slice(0, 3);

  const modeStep =
    mode === "help"
      ? "Keeping your voice and making the writing clearer…"
      : "Drafting a fresh post from your context…";

  const goalStep =
    goal === "job"
      ? "Highlighting skills and real impact for hiring visibility…"
      : goal === "growth"
        ? "Adding a stronger hook to boost engagement…"
        : "Adding deeper insight to build authority…";

  return [
    `Reading what you worked on: "${preview}${preview.length >= 70 ? "…" : ""}"`,
    uniqueWords.length > 0
      ? `Pulling key points: ${uniqueWords.join(", ")}`
      : "Finding your strongest takeaway…",
    modeStep,
    goalStep,
    uniqueWords.length > 0
      ? "Structuring your post with hook, story, and CTA…"
      : "Structuring your post so it is easy to read…",
    "Almost done - polishing your final draft…",
  ];
}

export function DashboardUi() {
  const [text, setText] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("help");
  const [goal, setGoal] = React.useState<Goal>("growth");
  const [defaultGoal, setDefaultGoal] = React.useState<Goal>("growth");
  const [tone, setTone] = React.useState<Tone>("professional");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState<string | null>(
    null
  );
  const [result, setResult] = React.useState<GenerateResponse | null>(null);
  const [draft, setDraft] = React.useState<string>("");
  const [history, setHistory] = React.useState<HistoryPost[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [settingsSaving, setSettingsSaving] = React.useState(false);

  const fetchSettings = React.useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { defaultGoal?: Goal; tone?: Tone; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error || "Failed to load settings.");

      const nextGoal = data?.defaultGoal ?? "growth";
      const nextTone = data?.tone ?? "professional";
      setDefaultGoal(nextGoal);
      setGoal(nextGoal);
      setTone(nextTone);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load settings.";
      toast.error(msg);
    }
  }, []);

  const saveSettings = React.useCallback(
    async (nextGoal: Goal, nextTone: Tone) => {
      setSettingsSaving(true);
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
        setSettingsSaving(false);
      }
    },
    []
  );

  const fetchHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/posts", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { posts?: HistoryPost[]; error?: string }
        | null;

      if (!res.ok) throw new Error(data?.error || "Failed to load history.");
      setHistory(Array.isArray(data?.posts) ? data.posts : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load history.";
      toast.error(msg);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchSettings();
    void fetchHistory();
  }, [fetchHistory, fetchSettings]);

  async function callGenerate({
    userInput,
    toastLabel,
  }: {
    userInput: string;
    toastLabel: string;
  }) {
    if (isGenerating) return;
    if (!userInput.trim()) {
      toast.info("Add a few bullet points first.");
      return;
    }

    setIsGenerating(true);
    const id = toast.loading(toastLabel);
    const liveSteps = buildLiveToastSteps({ input: userInput, mode, goal });
    let stepIndex = 0;
    toast.message(liveSteps[stepIndex], { id });
    const liveTicker = window.setInterval(() => {
      if (stepIndex >= liveSteps.length - 1) {
        // Keep showing the last "in progress" step until backend returns.
        return;
      }
      stepIndex += 1;
      toast.message(liveSteps[stepIndex], { id });
    }, 1200);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput,
          mode: mode === "help" ? "help" : "write",
          goal,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | GenerateResponse
        | { error?: string; raw?: string }
        | null;

      if (!res.ok) {
        const msg =
          (data && "error" in data && typeof data.error === "string" && data.error) ||
          "Failed to generate. Please try again.";
        throw new Error(msg);
      }

      if (
        !data ||
        typeof (data as GenerateResponse).post !== "string" ||
        !Array.isArray((data as GenerateResponse).hashtags) ||
        typeof (data as GenerateResponse).bestTime !== "string" ||
        !Array.isArray((data as GenerateResponse).suggestions)
      ) {
        throw new Error("Unexpected response format from the server.");
      }

      const next = data as GenerateResponse;
      setResult(next);
      setDraft(next.post);
      void fetchHistory();
      toast.success("Post generated.", { id });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      toast.error(message, { id });
    } finally {
      window.clearInterval(liveTicker);
      setIsGenerating(false);
    }
  }

  async function onGenerate() {
    return callGenerate({
      userInput: text.trim(),
      toastLabel: "Generating your post…",
    });
  }

  async function onRegenerate(instruction: string) {
    if (!draft.trim()) {
      toast.info("Generate a post first.");
      return;
    }
    if (isGenerating || isRegenerating) return;

    setIsRegenerating(instruction);
    try {
      await callGenerate({
        userInput: [
          `Instruction: ${instruction}`,
          "",
          "Rewrite the post below. Keep it as a LinkedIn post.",
          "",
          "Post:",
          draft.trim(),
        ].join("\n"),
        toastLabel: "Regenerating…",
      });
    } finally {
      setIsRegenerating(null);
    }
  }

  async function copyToClipboard() {
    if (!draft.trim()) {
      toast.info("Nothing to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Copy failed. Please copy manually.");
    }
  }

  function loadFromHistory(post: HistoryPost) {
    setDraft(post.content);
    setResult({
      post: post.content,
      hashtags: post.hashtags ?? [],
      bestTime: "Generate again to refresh best posting time.",
      suggestions: ["Generate again to get fresh suggestions for this draft."],
    });
    toast.success("Loaded post from history.");
  }

  function onDefaultGoalChange(value: Goal) {
    setDefaultGoal(value);
    void saveSettings(value, tone);
  }

  function onToneChange(value: Tone) {
    setTone(value);
    void saveSettings(defaultGoal, value);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="work">What did you work on today?</Label>
            <Textarea
              id="work"
              placeholder="What did you work on today?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-28"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="goal">Goal</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent align="start" >
                  <SelectItem value="job">Get a Job</SelectItem>
                  <SelectItem value="growth">Grow on LinkedIn</SelectItem>
                  <SelectItem value="authority">Build Authority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Mode</Label>
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as Mode)}
                className="w-full"
              >
                <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl border bg-muted p-1">
                  <TabsTrigger value="help" className="h-8 rounded-lg text-sm">
                    Help Me Write
                  </TabsTrigger>
                  <TabsTrigger value="auto" className="h-8 rounded-lg text-sm">
                    Write For Me
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onGenerate}
              disabled={isGenerating}
              className="h-11 px-6"
            >
              {isGenerating ? "Generating…" : "Generate Post"}
            </Button>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed bg-background p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Your generated post will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <p className="text-sm font-medium">Generated post</p>
                <p className="text-xs text-muted-foreground">
                  Edit it before posting.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                Copy
              </Button>
            </div>

            <div className="mt-4">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-72"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGenerating || !!isRegenerating}
                onClick={() => onRegenerate("Rewrite this post to be shorter.")}
              >
                Make it shorter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGenerating || !!isRegenerating}
                onClick={() => onRegenerate("Rewrite this post to be more casual.")}
              >
                More casual
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGenerating || !!isRegenerating}
                onClick={() => onRegenerate("Rewrite this post to be more technical.")}
              >
                More technical
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGenerating || !!isRegenerating}
                onClick={() =>
                  onRegenerate("Rewrite this post to add more storytelling.")
                }
              >
                Add storytelling
              </Button>
            </div>
          </div>

          <aside className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <p className="text-sm font-medium">Hashtags</p>
                {result.hashtags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {result.hashtags.map((tag, i) => (
                      <li
                        key={`${tag}-${i}`}
                        className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-medium">Best time to post</p>
                <p className="text-sm text-muted-foreground">{result.bestTime}</p>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-medium">Suggestions</p>
                {result.suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="grid gap-2">
                    {result.suggestions.map((s, i) => (
                      <li
                        key={`${i}-${s.slice(0, 24)}`}
                        className="rounded-xl border bg-background p-3 text-sm text-muted-foreground"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Settings</h2>
          <p className="text-xs text-muted-foreground">
            {settingsSaving ? "Saving..." : "Saved automatically"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="default-goal">Default goal</Label>
            <Select value={defaultGoal} onValueChange={(v) => onDefaultGoalChange(v as Goal)}>
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
            <Select value={tone} onValueChange={(v) => onToneChange(v as Tone)}>
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
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">History</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void fetchHistory()}
            disabled={historyLoading}
          >
            {historyLoading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
            No posts yet. Generate one to see history here.
          </div>
        ) : (
          <div className="grid gap-2">
            {history.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => loadFromHistory(post)}
                className="rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted"
              >
                <p className="line-clamp-2 text-sm text-foreground">
                  {post.content}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

