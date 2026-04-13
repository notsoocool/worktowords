import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function HistorySkeletonList({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-3", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-2xl border bg-background p-4 sm:p-5"
        >
          <div className="flex justify-between gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[90%]" />
            <Skeleton className="h-3 w-[70%]" />
          </div>
          <Skeleton className="mt-4 h-3 w-2/3" />
          <div className="mt-4 flex justify-end border-t border-border/50 pt-3">
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}
