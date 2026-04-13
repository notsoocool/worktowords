"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

function calculateRadius(x: number, y: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const corners = [
    Math.hypot(x, y),
    Math.hypot(w - x, y),
    Math.hypot(x, h - y),
    Math.hypot(w - x, h - y),
  ];
  return Math.max(...corners);
}

type ViewTransitionLike = {
  ready: Promise<void>;
};

export function ThemeRippleToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function onToggle(e: React.MouseEvent<HTMLButtonElement>) {
    if (!mounted) return;
    const nextTheme = isDark ? "light" : "dark";
    const x = e.clientX;
    const y = e.clientY;
    const radius = calculateRadius(x, y);

    const documentWithVT = document as Document & {
      startViewTransition?: (update: () => void | Promise<void>) => ViewTransitionLike;
    };
    if (!documentWithVT.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const transition = documentWithVT.startViewTransition.call(document, () => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 550,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        } as KeyframeAnimationOptions
      );
    });
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onToggle}
        className="fixed right-6 bottom-6 z-50 size-11 rounded-full bg-background/85 shadow-lg backdrop-blur transition-all hover:scale-105 hover:shadow-xl"
        aria-label="Toggle theme"
      >
        {!mounted ? (
          <Sun className="size-4" />
        ) : isDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </Button>
    </>
  );
}

