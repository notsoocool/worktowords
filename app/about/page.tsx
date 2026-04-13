import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">About</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        WorktoWords helps you turn notes about what you shipped, learned, and
        solved into polished LinkedIn posts. This page will include more about
        the product and team soon.
      </p>
      <div className="mt-8">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
