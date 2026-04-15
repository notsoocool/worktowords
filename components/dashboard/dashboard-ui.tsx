"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { DashboardOutputSkeleton } from "@/components/dashboard/output-skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toFriendlyBillingError } from "@/lib/billing-errors";

type Mode = "help" | "auto";
type Goal = "job" | "growth" | "authority";
type Platform = "linkedin" | "instagram" | "youtube";

type GenerateResponse = {
  hashtags: string[];
  bestTime: string;
  suggestions: string[];
  post?: string;
  linkedin?: string;
  instagram?: {
    reelIdea?: string;
    script?: string;
    caption: string;
    hashtags: string[];
    bestTime: string;
    suggestions: string[];
  };
  youtube?: {
    title: string;
    hook?: string;
    script?: string;
    description: string;
    tags: string[];
    chapterIdeas: string[];
    suggestions: string[];
  };
};

type UsageStatus = {
  dailyUsage: number;
  limitPerDay: number;
  remaining: number;
  plan: "free" | "pro";
  lastUsedDate: string;
  planExpiry: string | null;
};

type RazorpayOrderPayload = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: "pro";
  monthlyPriceInr: number;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on?: (event: string, cb: (payload: unknown) => void) => void;
};

type RazorpayCheckoutConstructor = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessPayload) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}) => RazorpayCheckoutInstance;

function getRazorpayConstructor() {
  return (window as Window & { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
}

async function ensureRazorpayLoaded() {
  if (getRazorpayConstructor()) return true;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
    document.body.appendChild(script);
  }).catch(() => null);

  return Boolean(getRazorpayConstructor());
}

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
    `Skimming your notes: "${preview}${preview.length >= 70 ? "…" : ""}"`,
    uniqueWords.length > 0
      ? `Picking out the main bits (${uniqueWords.join(", ")})…`
      : "Finding the most interesting takeaway…",
    modeStep,
    goalStep,
    uniqueWords.length > 0
      ? "Laying it out so it’s easy to skim…"
      : "Tidying the structure and flow…",
    "Almost done — giving it a final polish…",
  ];
}

function buildDraftWithHashtagsText(postText: string, hashtags: string[]) {
  const tags = hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  if (tags.length === 0) return postText;
  return `${postText}\n\n${tags.join(" ")}`;
}

export function DashboardUi() {
  const searchParams = useSearchParams();
  const [text, setText] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("help");
  const [goal, setGoal] = React.useState<Goal>("growth");
  const [platforms, setPlatforms] = React.useState<Platform[]>(["linkedin"]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [limitReachedOpen, setLimitReachedOpen] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState<string | null>(
    null
  );
  const [result, setResult] = React.useState<GenerateResponse | null>(null);
  const [linkedIn, setLinkedIn] = React.useState<string>("");
  const [instagram, setInstagram] = React.useState<GenerateResponse["instagram"] | null>(null);
  const [youtube, setYouTube] = React.useState<GenerateResponse["youtube"] | null>(null);
  const [platformLoading, setPlatformLoading] = React.useState<
    Partial<Record<Platform, boolean>>
  >({});
  const [draft, setDraft] = React.useState<string>("");
  const [lastUserInput, setLastUserInput] = React.useState<string>("");
  const [outputTab, setOutputTab] = React.useState<Platform>("linkedin");
  const [usage, setUsage] = React.useState<UsageStatus | null>(null);
  const [isUpgrading, setIsUpgrading] = React.useState(false);

  React.useEffect(() => {
    const postId = searchParams.get("post");
    if (!postId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
          method: "GET",
        });
        const data = (await res.json().catch(() => null)) as
          | {
              post?: {
                id: string | number;
                content: string;
                hashtags: string[];
                goal: Goal;
                type?: "single" | "multi";
                linkedin?: string | null;
                instagram?:
                  | { reelIdea: string; caption: string; script: string }
                  | null;
                youtube?: { title: string; hook: string; script: string } | null;
                created_at: string;
              };
              error?: string;
            }
          | null;

        if (!res.ok) throw new Error(data?.error || "Failed to load history item.");
        const post = data?.post;
        if (!post) throw new Error("History item not found.");
        if (cancelled) return;

        const nextPlatforms: Platform[] = [];
        if (post.linkedin && post.linkedin.trim()) nextPlatforms.push("linkedin");
        if (post.instagram) nextPlatforms.push("instagram");
        if (post.youtube) nextPlatforms.push("youtube");
        const ensuredPlatforms = nextPlatforms.length ? nextPlatforms : (["linkedin"] as Platform[]);

        const linkedInText = post.linkedin ?? post.content ?? "";

        setText(post.content ?? "");
        setLastUserInput(post.content ?? "");
        setPlatforms(ensuredPlatforms);
        setGoal(
          post.goal === "job" || post.goal === "growth" || post.goal === "authority"
            ? post.goal
            : "growth"
        );

        setResult({
          hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
          bestTime: "",
          suggestions: [],
          post: post.content,
          linkedin: post.linkedin ?? undefined,
          instagram: post.instagram
            ? {
                caption: post.instagram.caption,
                hashtags: [],
                bestTime: "",
                suggestions: post.instagram.reelIdea ? [post.instagram.reelIdea] : [],
                reelIdea: post.instagram.reelIdea,
                script: post.instagram.script,
              }
            : undefined,
          youtube: post.youtube
            ? {
                title: post.youtube.title,
                description: post.youtube.script,
                tags: [],
                chapterIdeas: post.youtube.hook ? [post.youtube.hook] : [],
                suggestions: [],
                hook: post.youtube.hook,
                script: post.youtube.script,
              }
            : undefined,
        });

        setLinkedIn(linkedInText);
        setDraft(buildDraftWithHashtagsText(linkedInText, post.hashtags ?? []));
        setInstagram(
          post.instagram
            ? {
                caption: post.instagram.caption,
                hashtags: [],
                bestTime: "",
                suggestions: post.instagram.reelIdea ? [post.instagram.reelIdea] : [],
                reelIdea: post.instagram.reelIdea,
                script: post.instagram.script,
              }
            : null
        );
        setYouTube(
          post.youtube
            ? {
                title: post.youtube.title,
                description: post.youtube.script,
                tags: [],
                chapterIdeas: post.youtube.hook ? [post.youtube.hook] : [],
                suggestions: [],
                hook: post.youtube.hook,
                script: post.youtube.script,
              }
            : null
        );

        setOutputTab(ensuredPlatforms[0] ?? "linkedin");
        toast.success("Loaded from history.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load history item.";
        toast.error(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const fetchUsage = React.useCallback(async () => {
    try {
      const res = await fetch("/api/usage", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | UsageStatus
        | { error?: string }
        | null;
      if (!res.ok) throw new Error((data && "error" in data && data.error) || "Failed to load usage.");

      if (
        data &&
        typeof data === "object" &&
        "remaining" in data &&
        typeof data.remaining === "number"
      ) {
        setUsage(data as UsageStatus);
      } else {
        setUsage(null);
      }
    } catch {
      setUsage(null);
    }
  }, []);

  const fetchSettings = React.useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { defaultGoal?: Goal; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error || "Failed to load settings.");

      const nextGoal = data?.defaultGoal ?? "growth";
      setGoal(nextGoal);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load settings.";
      toast.error(msg);
    }
  }, []);

  React.useEffect(() => {
    void fetchSettings();
    void fetchUsage();
  }, [fetchSettings, fetchUsage]);

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
    setPlatformLoading(
      platforms.reduce<Partial<Record<Platform, boolean>>>((acc, p) => {
        acc[p] = true;
        return acc;
      }, {})
    );
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
          platforms,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | GenerateResponse
        | { error?: string; message?: string; raw?: string }
        | null;

      if (!res.ok) {
        if (
          data &&
          typeof data === "object" &&
          "error" in data &&
          data.error === "LIMIT_REACHED"
        ) {
          setLimitReachedOpen(true);
          void fetchUsage();
          toast.error("Daily limit reached.", { id });
          return;
        }
        const msg =
          (data && "error" in data && typeof data.error === "string" && data.error) ||
          "Failed to generate. Please try again.";
        throw new Error(msg);
      }

      if (
        !data ||
        !Array.isArray((data as GenerateResponse).hashtags) ||
        typeof (data as GenerateResponse).bestTime !== "string" ||
        !Array.isArray((data as GenerateResponse).suggestions)
      ) {
        throw new Error("Unexpected response format from the server.");
      }

      const next = data as GenerateResponse;
      setLastUserInput(userInput);
      setResult(next);
      const linkedInText = next.linkedin ?? next.post ?? "";
      setLinkedIn(linkedInText);
      setInstagram(next.instagram ?? null);
      setYouTube(next.youtube ?? null);
      setDraft(buildDraftWithHashtagsText(linkedInText, next.hashtags));
      void fetchUsage();
      toast.success("Post generated.", { id });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      toast.error(message, { id });
    } finally {
      window.clearInterval(liveTicker);
      setPlatformLoading({});
      setIsGenerating(false);
    }
  }

  async function onGenerate() {
    return callGenerate({
      userInput: text.trim(),
      toastLabel: "Generating your post…",
    });
  }

  async function regeneratePlatform(platform: Platform) {
    const baseInput = (lastUserInput || text).trim();
    if (!baseInput) {
      toast.info("Add a few bullet points first.");
      return;
    }
    if (isGenerating || isRegenerating || limitReachedOpen) return;

    setOutputTab(platform);
    setIsGenerating(true);
    setPlatformLoading({ [platform]: true });
    const id = toast.loading(`Regenerating ${platform}…`);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: baseInput,
          mode: mode === "help" ? "help" : "write",
          goal,
          platforms: [platform],
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | GenerateResponse
        | { error?: string; message?: string; raw?: string }
        | null;

      if (!res.ok) {
        if (
          data &&
          typeof data === "object" &&
          "error" in data &&
          data.error === "LIMIT_REACHED"
        ) {
          setLimitReachedOpen(true);
          void fetchUsage();
          toast.error("Daily limit reached.", { id });
          return;
        }
        const msg =
          (data && "error" in data && typeof data.error === "string" && data.error) ||
          "Failed to regenerate. Please try again.";
        throw new Error(msg);
      }

      if (
        !data ||
        !Array.isArray((data as GenerateResponse).hashtags) ||
        typeof (data as GenerateResponse).bestTime !== "string" ||
        !Array.isArray((data as GenerateResponse).suggestions)
      ) {
        throw new Error("Unexpected response format from the server.");
      }

      const next = data as GenerateResponse;
      setLastUserInput(baseInput);

      setResult((prev) => {
        const base =
          prev ??
          ({
            hashtags: [],
            bestTime: "",
            suggestions: [],
          } satisfies GenerateResponse);

        if (platform === "linkedin") {
          return {
            ...base,
            hashtags: next.hashtags,
            bestTime: next.bestTime,
            suggestions: next.suggestions,
            post: next.post ?? base.post,
            linkedin: next.linkedin ?? next.post ?? base.linkedin,
          };
        }

        if (platform === "instagram") {
          return {
            ...base,
            instagram: next.instagram ?? base.instagram,
          };
        }

        return {
          ...base,
          youtube: next.youtube ?? base.youtube,
        };
      });

      if (platform === "linkedin") {
        const linkedInText = next.linkedin ?? next.post ?? "";
        setLinkedIn(linkedInText);
        setDraft(buildDraftWithHashtagsText(linkedInText, next.hashtags));
      } else if (platform === "instagram") {
        setInstagram(next.instagram ?? null);
      } else {
        setYouTube(next.youtube ?? null);
      }

      void fetchUsage();
      toast.success("Regenerated.", { id });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Try again.";
      toast.error(message, { id });
    } finally {
      setPlatformLoading({});
      setIsGenerating(false);
    }
  }

  function togglePlatform(next: Platform, checked: boolean) {
    setPlatforms((prev) => {
      const has = prev.includes(next);
      const updated = checked ? (has ? prev : [...prev, next]) : prev.filter((p) => p !== next);
      return updated.length === 0 ? ["linkedin"] : updated;
    });
  }

  async function onRegenerate(instruction: string) {
    if (!draft.trim()) {
      toast.info("Generate a post first.");
      return;
    }
    if (isGenerating || isRegenerating || limitReachedOpen) return;

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

  async function copyText(label: string, value: string) {
    if (!value.trim()) {
      toast.info("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Copy failed. Please copy manually.");
    }
  }

  async function onUpgradeToPro() {
    if (isUpgrading) return;
    if (usage?.plan === "pro") {
      toast.success("You are already on Pro.");
      return;
    }

    setIsUpgrading(true);
    const loadingId = toast.loading("Opening Razorpay checkout…");

    try {
      const orderRes = await fetch("/api/razorpay/create-order", { method: "POST" });
      const orderData = (await orderRes.json().catch(() => null)) as
        | RazorpayOrderPayload
        | { error?: string }
        | null;

      if (!orderRes.ok || !orderData || !("orderId" in orderData)) {
        throw new Error(
          (orderData && "error" in orderData && orderData.error) ||
            "Could not start checkout."
        );
      }

      const loaded = await ensureRazorpayLoaded();
      if (!loaded) throw new Error("Razorpay checkout could not be loaded.");

      const RazorpayCheckout = getRazorpayConstructor();
      if (!RazorpayCheckout) throw new Error("Razorpay is unavailable.");

      toast.message("Pay via UPI (GPay, PhonePe, Paytm)", {
        id: loadingId,
      });

      const checkout = new RazorpayCheckout({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "WorktoWords",
        description: "Pro Plan — ₹149/month",
        order_id: orderData.orderId,
        prefill: {
          name: orderData.prefill?.name ?? "",
          email: orderData.prefill?.email ?? "",
          contact: orderData.prefill?.contact ?? "",
        },
        notes: {
          plan: "pro",
          source: "worktowords_dashboard",
        },
        handler: async (payment) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payment),
            });
            const verifyData = (await verifyRes.json().catch(() => null)) as
              | { ok?: boolean; error?: string }
              | null;

            if (!verifyRes.ok || !verifyData?.ok) {
              throw new Error(
                verifyData?.error || "Payment succeeded but verification failed."
              );
            }

            toast.success("Payment successful. Pro is now active for 30 days.", {
              id: loadingId,
            });
            setLimitReachedOpen(false);
            void fetchUsage();
          } catch (error) {
            const msg = toFriendlyBillingError(error);
            toast.error(msg, { id: loadingId });
          } finally {
            setIsUpgrading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsUpgrading(false);
            toast.info("Checkout closed.", { id: loadingId });
          },
        },
        theme: { color: "#111827" },
      });

      checkout.on?.("payment.failed", () => {
        setIsUpgrading(false);
        toast.error("Payment failed. Please try again.", { id: loadingId });
      });

      checkout.open();
    } catch (error) {
      const msg = toFriendlyBillingError(error);
      toast.error(msg, { id: loadingId });
      setIsUpgrading(false);
    }
  }

  return (
    <main className="animate-fade-in mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-12">
      {limitReachedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur"
            onClick={() => setLimitReachedOpen(false)}
          />
          <div className="saas-card relative w-full max-w-md p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Daily Limit Reached
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {usage?.plan === "pro"
                ? "You’ve hit today’s generation limit."
                : `You’ve used your ${usage?.limitPerDay ?? 5} free posts for today.`}
            </p>
            {usage?.plan !== "pro" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Pay via UPI (GPay, PhonePe, Paytm)
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-11 rounded-xl"
                onClick={onUpgradeToPro}
                disabled={isUpgrading || usage?.plan === "pro"}
              >
                {usage?.plan === "pro"
                  ? "Pro Activated"
                  : isUpgrading
                    ? "Opening checkout…"
                    : "Upgrade to Pro"}
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setLimitReachedOpen(false)}
              >
                Come back tomorrow
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="saas-card p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="work" className="text-sm font-semibold">
              What did you work on today?
            </Label>
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
              <Label htmlFor="goal" className="text-sm font-semibold">
                Goal
              </Label>
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
              <Label className="text-sm font-semibold">Mode</Label>
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-2">
              <Label className="text-sm font-semibold">Select Platforms</Label>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={platforms.includes("linkedin")}
                    onChange={(e) => togglePlatform("linkedin", e.target.checked)}
                  />
                  LinkedIn
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={platforms.includes("instagram")}
                    onChange={(e) => togglePlatform("instagram", e.target.checked)}
                  />
                  Instagram
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={platforms.includes("youtube")}
                    onChange={(e) => togglePlatform("youtube", e.target.checked)}
                  />
                  YouTube
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                LinkedIn is always included if none are selected.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {usage ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {usage.remaining}
                  </span>{" "}
                  left today
                </p>
              ) : null}
              <Button
                onClick={onGenerate}
                disabled={isGenerating || limitReachedOpen}
                className="h-11 rounded-xl px-6 transition-transform hover:-translate-y-0.5"
              >
                {isGenerating ? "Generating…" : "Generate Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isGenerating && !result ? (
        <DashboardOutputSkeleton className="mt-6 animate-fade-in-delayed" />
      ) : !result ? (
        <div className="saas-card mt-6 animate-fade-in p-8 sm:p-10">
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border bg-background shadow-sm">
              <Sparkles className="h-6 w-6 text-muted-foreground" aria-hidden />
            </div>
            <h2 className="text-base font-semibold tracking-tight">
              No generated content yet
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Add notes about what you worked on, then hit{" "}
              <span className="font-medium text-foreground">Generate Post</span>{" "}
              — your draft, hashtags, and suggestions will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative mt-6 grid animate-fade-in gap-6 md:grid-cols-[1.2fr_0.8fr]">
          {isGenerating ? (
            <div
              className="animate-fade-in absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                {isRegenerating ? "Refining your post…" : "Generating your post…"}
              </p>
            </div>
          ) : null}
          <div
            className={cn(
              "saas-card p-6 sm:p-8",
              isGenerating && "pointer-events-none opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <p className="text-base font-semibold">Generated content</p>
                <p className="text-xs text-muted-foreground">
                  Switch platforms using tabs below.
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

            {(() => {
              const tabs = (["linkedin", "instagram", "youtube"] as Platform[]).filter((p) => {
                if (p === "linkedin") return Boolean((result.linkedin ?? result.post ?? linkedIn).trim());
                if (p === "instagram") return Boolean(result.instagram ?? instagram);
                if (p === "youtube") return Boolean(result.youtube ?? youtube);
                return false;
              });
              const tabDefault = (tabs[0] ?? "linkedin") as Platform;
              return (
                <Tabs
                  value={tabs.includes(outputTab) ? outputTab : tabDefault}
                  onValueChange={(v) => setOutputTab(v as Platform)}
                  className="mt-4"
                >
                  <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl border bg-muted p-1">
                    {tabs.includes("linkedin") ? (
                      <TabsTrigger value="linkedin" className="h-8 rounded-lg text-sm">
                        LinkedIn
                      </TabsTrigger>
                    ) : null}
                    {tabs.includes("instagram") ? (
                      <TabsTrigger value="instagram" className="h-8 rounded-lg text-sm">
                        Instagram
                      </TabsTrigger>
                    ) : null}
                    {tabs.includes("youtube") ? (
                      <TabsTrigger value="youtube" className="h-8 rounded-lg text-sm">
                        YouTube
                      </TabsTrigger>
                    ) : null}
                  </TabsList>

                  <TabsContent value="linkedin" className="mt-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">Editable</p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => void copyText("LinkedIn post", draft)}
                          >
                            Copy
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={isGenerating || !!isRegenerating}
                            onClick={() => void regeneratePlatform("linkedin")}
                          >
                            Regenerate
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="min-h-72"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
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
                  </TabsContent>

                  <TabsContent value="instagram" className="mt-4">
                    {platformLoading.instagram ? (
                      <p className="text-sm text-muted-foreground">Generating Instagram…</p>
                    ) : instagram ? (
                      <div className="grid gap-4">
                        <div className="rounded-2xl border bg-background p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Reel Idea
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              disabled={isGenerating || !!isRegenerating}
                              onClick={() => void regeneratePlatform("instagram")}
                            >
                              Regenerate
                            </Button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                            {(instagram.reelIdea as string | undefined) ??
                              instagram.suggestions[0] ??
                              "Hook the viewer with a concrete outcome, then show the steps."}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-background p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-muted-foreground">Script</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() =>
                                void copyText(
                                  "Instagram script",
                                  (instagram.script as string | undefined) ?? instagram.caption
                                )
                              }
                            >
                              Copy script
                            </Button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                            {(instagram.script as string | undefined) ?? instagram.caption}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-background p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-muted-foreground">Caption</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => void copyText("Instagram caption", instagram.caption)}
                            >
                              Copy caption
                            </Button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                            {instagram.caption}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No Instagram output.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="youtube" className="mt-4">
                    {platformLoading.youtube ? (
                      <p className="text-sm text-muted-foreground">Generating YouTube…</p>
                    ) : youtube ? (
                      <div className="grid gap-4">
                        <div className="rounded-2xl border bg-background p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-muted-foreground">Title</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => void copyText("YouTube title", youtube.title)}
                            >
                              Copy title
                            </Button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-foreground/90">
                            {youtube.title}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-background p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-muted-foreground">Hook</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              disabled={isGenerating || !!isRegenerating}
                              onClick={() => void regeneratePlatform("youtube")}
                            >
                              Regenerate
                            </Button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                            {(youtube.hook as string | undefined) ??
                              youtube.chapterIdeas[0] ??
                              youtube.suggestions[0] ??
                              "Open with the strongest payoff in the first 10 seconds."}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-background p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-muted-foreground">Script</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() =>
                                void copyText(
                                  "YouTube script",
                                  (youtube.script as string | undefined) ?? youtube.description
                                )
                              }
                            >
                              Copy script
                            </Button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                            {(youtube.script as string | undefined) ?? youtube.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No YouTube output.</p>
                    )}
                  </TabsContent>
                </Tabs>
              );
            })()}
          </div>

          <aside
            className={cn(
              "saas-card p-6 sm:p-8",
              isGenerating && "pointer-events-none opacity-60"
            )}
          >
            <div className="grid gap-6">
              <div className="grid gap-2">
                <p className="text-base font-semibold">Hashtags</p>
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
                <p className="text-base font-semibold">Best time to post</p>
                <p className="text-sm text-muted-foreground">{result.bestTime}</p>
              </div>

              <div className="grid gap-2">
                <p className="text-base font-semibold">Suggestions</p>
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

      <p className="mt-6 text-center text-xs text-muted-foreground animate-fade-in">
        Default goal and writing tone:{" "}
        <Link
          href="/settings"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Settings
        </Link>
        · Past posts:{" "}
        <Link
          href="/history"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          History
        </Link>
      </p>
    </main>
  );
}

