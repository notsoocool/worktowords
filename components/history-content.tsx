"use client";

import * as React from "react";
import Link from "next/link";
import { Library } from "lucide-react";
import { toast } from "sonner";

import { HistorySkeletonList } from "@/components/history/history-skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Goal = "job" | "growth" | "authority";
type GoalFilter = "all" | Goal;

type HistoryPost = {
  id: string | number;
  content: string;
  hashtags: string[];
  goal: Goal;
  created_at: string;
};

const GOAL_LABEL: Record<Goal, string> = {
  job: "Job",
  growth: "Growth",
  authority: "Authority",
};

function goalBadgeClass(goal: Goal) {
  switch (goal) {
    case "job":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "growth":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "authority":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function HistoryContent() {
  const [filter, setFilter] = React.useState<GoalFilter>("all");
  const [history, setHistory] = React.useState<HistoryPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchHistory = React.useCallback(async () => {
    setLoading(true);
    try {
      const url =
        filter === "all" ? "/api/posts" : `/api/posts?goal=${filter}`;
      const res = await fetch(url, { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { posts?: HistoryPost[]; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error || "Failed to load history.");
      const posts = Array.isArray(data?.posts) ? data.posts : [];
      setHistory(
        posts.map((p) => ({
          ...p,
          goal:
            p.goal === "job" || p.goal === "growth" || p.goal === "authority"
              ? p.goal
              : "growth",
        }))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load history.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  async function copyPost(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Copy failed.");
    }
  }

  return (
    <div className="saas-card animate-fade-in p-6 sm:p-8">
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your content library — filter by the goal you had in mind when you
            generated each post.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 self-start"
          onClick={() => void fetchHistory()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as GoalFilter)}
        className="mt-6"
      >
        <TabsList
          variant="line"
          className="mb-6 h-auto w-full flex-wrap gap-1 rounded-xl border bg-muted/50 p-1 sm:inline-flex sm:w-auto"
        >
          <TabsTrigger value="all" className="rounded-lg px-4">
            All
          </TabsTrigger>
          <TabsTrigger value="job" className="rounded-lg px-4">
            Job
          </TabsTrigger>
          <TabsTrigger value="growth" className="rounded-lg px-4">
            Growth
          </TabsTrigger>
          <TabsTrigger value="authority" className="rounded-lg px-4">
            Authority
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <HistorySkeletonList className="animate-fade-in-delayed" />
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-14 text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border bg-background shadow-sm">
            <Library className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          {filter === "all" ? (
            <>
              <h2 className="text-base font-semibold tracking-tight">Your library is empty</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Saved posts will appear here.{" "}
                <Link
                  href="/dashboard"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Generate a post on the dashboard
                </Link>{" "}
                to get started.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold tracking-tight">
                No posts for {GOAL_LABEL[filter]}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Try another filter or{" "}
                <Link
                  href="/dashboard"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  create a post
                </Link>{" "}
                with this goal.
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 animate-fade-in">
          {history.map((post) => (
            <li
              key={post.id}
              className="group rounded-2xl border bg-background p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                    goalBadgeClass(post.goal)
                  )}
                >
                  {GOAL_LABEL[post.goal]}
                </span>
                <time
                  className="text-xs text-muted-foreground tabular-nums"
                  dateTime={post.created_at}
                >
                  {new Date(post.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {post.content}
              </p>
              {post.hashtags?.length ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {post.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end border-t border-border/50 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void copyPost(post.content)}
                >
                  Copy
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
