import type { ReactNode } from "react";
import Link from "next/link";

import { BrandLogoLink } from "@/components/brand-logo";

const linkClass =
  "text-sm text-muted-foreground transition-[color,text-decoration-color] duration-200 hover:text-foreground hover:underline decoration-foreground/30 underline-offset-4";

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {title}
      </h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="flex flex-col gap-3">
            <BrandLogoLink
              href="/"
              size={40}
              wordmarkClassName="text-base"
            />
            <p className="max-w-xs text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
              From notes to network-ready posts
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Turn your daily work into high-quality LinkedIn posts using AI.
            </p>
          </div>

          <FooterColumn title="Product">
            <Link href="/dashboard" className={linkClass}>
              Dashboard
            </Link>
            <Link href="/history" className={linkClass}>
              History
            </Link>
            <Link href="/settings" className={linkClass}>
              Settings
            </Link>
          </FooterColumn>

          <FooterColumn title="Company">
            <Link href="/about" className={linkClass}>
              About
            </Link>
            <a
              href="mailto:vyasyajush@gmail.com"
              className={linkClass}
            >
              Contact
            </a>
          </FooterColumn>

          <FooterColumn title="Legal">
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={linkClass}>
              Terms of Service
            </Link>
          </FooterColumn>
        </div>

        <div className="mt-12 border-t border-border/60 pt-8">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            © 2026 WorktoWords. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
