import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function Navbar({ className }: { className?: string }) {
  const hasClerkKey =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur",
        className
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="text-sm text-muted-foreground">●</span>
          <span>WorktoWords</span>
        </Link>

        <div className="flex items-center gap-3">
          {!hasClerkKey ? (
            <Button variant="outline" size="sm" disabled>
              Sign In
            </Button>
          ) : (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

