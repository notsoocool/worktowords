import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/worktowordslogo.svg";

export type BrandLogoProps = {
  className?: string;
  /** Logo mark size (square) in pixels */
  size?: number;
  /** Show the WorktoWords wordmark next to the mark */
  withWordmark?: boolean;
  wordmarkClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  className,
  size = 32,
  withWordmark = true,
  wordmarkClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="inline-flex shrink-0 overflow-hidden rounded-lg ring-1 ring-border/50"
        style={{ width: size, height: size }}
      >
        <Image
          src={BRAND_LOGO_SRC}
          alt="WorktoWords"
          width={size}
          height={size}
          className="h-full w-full object-contain dark:invert transition-[filter] duration-200"
          priority={priority}
        />
      </span>
      {withWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            wordmarkClassName ?? "text-sm"
          )}
        >
          WorktoWords
        </span>
      ) : null}
    </span>
  );
}

export type BrandLogoLinkProps = BrandLogoProps & {
  href?: string;
  linkClassName?: string;
};

export function BrandLogoLink({
  href = "/",
  linkClassName,
  ...logoProps
}: BrandLogoLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex w-fit transition-opacity duration-200 hover:opacity-80",
        linkClassName
      )}
    >
      <BrandLogo {...logoProps} />
    </Link>
  );
}
