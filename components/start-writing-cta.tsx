"use client";

import { useRouter } from "next/navigation";
import { Show, SignInButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function StartWritingCta() {
  const router = useRouter();
  const hasClerkKey =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0;

  return (
    <>
      {!hasClerkKey ? (
        <Button size="lg" className="h-11 px-6" disabled>
          Start Writing
        </Button>
      ) : (
        <>
          <Show when="signed-in">
            <Button
              size="lg"
              className="h-11 px-6"
              onClick={() => router.push("/dashboard")}
            >
              Start Writing
            </Button>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="lg" className="h-11 px-6">
                Start Writing
              </Button>
            </SignInButton>
          </Show>
        </>
      )}
    </>
  );
}

