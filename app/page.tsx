import { Button } from "@/components/ui/button";
import { StartWritingCta } from "@/components/start-writing-cta";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-16 sm:px-6 sm:py-24">
          <div className="w-full max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              Write faster. Sound better. Post consistently.
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Turn your daily work into LinkedIn posts
            </h1>
            <p className="mt-4 text-balance text-base leading-7 text-muted-foreground sm:text-lg">
              Capture what you shipped, learned, and solved—then transform it into
              clean, on-brand posts in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <StartWritingCta />
              <Button variant="outline" size="lg" className="h-11 px-6">
                See examples
              </Button>
            </div>
          </div>

          <div className="mt-12 w-full max-w-5xl">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm font-medium">Daily input</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Drop bullet points from your day.
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm font-medium">Smart structure</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Hook → story → takeaway → CTA.
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm font-medium">SaaS polish</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Clean formatting, ready to post.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
