"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INPUT = "Built an MCP server for AI code impact analysis";

const LINKEDIN_PREVIEW =
  "Built an MCP server that helps AI understand code impact.\n\nInstead of guessing what a change might break, it surfaces:\n- affected modules\n- risk hotspots\n- suggested test areas\n\nThe goal: faster reviews, safer merges, fewer regressions.";

const INSTAGRAM_REEL_IDEA =
  "Reel hook: “I built a server that tells AI what your code change will impact.”\n\nShots:\n1) The problem (regressions)\n2) Quick demo (change → impact map)\n3) The payoff (safer merges)\n\nCTA: “Want a breakdown of how it works?”";

const YOUTUBE_TITLE =
  "I Built an MCP Server for AI Code Impact Analysis (Safer Merges, Fewer Regressions)";

export function MultiOutputPreview({ className }: { className?: string }) {
  const [tab, setTab] = React.useState<"linkedin" | "instagram" | "youtube">(
    "linkedin"
  );

  return (
    <section className={className}>
      <div className="saas-card p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground">
            Multi-platform preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            One input. Three outputs.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            See how WorktoWords turns a daily update into platform-ready content.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border bg-background p-4">
            <p className="text-xs font-medium text-muted-foreground">Input</p>
            <p className="mt-2 text-sm leading-6 text-foreground/90">{INPUT}</p>
          </div>

          <div className="rounded-2xl border bg-background p-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl border bg-muted p-1">
                <TabsTrigger value="linkedin" className="h-8 rounded-lg text-sm">
                  LinkedIn
                </TabsTrigger>
                <TabsTrigger
                  value="instagram"
                  className="h-8 rounded-lg text-sm"
                >
                  Instagram
                </TabsTrigger>
                <TabsTrigger value="youtube" className="h-8 rounded-lg text-sm">
                  YouTube
                </TabsTrigger>
              </TabsList>

              <TabsContent value="linkedin" className="mt-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {LINKEDIN_PREVIEW}
                </p>
              </TabsContent>

              <TabsContent value="instagram" className="mt-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {INSTAGRAM_REEL_IDEA}
                </p>
              </TabsContent>

              <TabsContent value="youtube" className="mt-4">
                <p className="text-sm leading-6 text-foreground/90">
                  {YOUTUBE_TITLE}
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}

