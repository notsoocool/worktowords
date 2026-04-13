import { BrandLogoLink } from "@/components/brand-logo";
import { AppNavbarLinks } from "@/components/app-navbar";
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
        "sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70",
        className
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-10">
          <BrandLogoLink
            href="/"
            priority
            size={32}
            className="shrink-0"
          />
          {hasClerkKey ? (
            <Show when="signed-in">
              <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <AppNavbarLinks />
              </div>
            </Show>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!hasClerkKey ? (
            <Button variant="outline" size="sm" disabled>
              Sign In
            </Button>
          ) : (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm" className="rounded-xl">
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
