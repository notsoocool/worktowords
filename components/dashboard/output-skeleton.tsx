import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardOutputSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-6 md:grid-cols-[1.2fr_0.8fr]",
        className
      )}
    >
      <div className="saas-card space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[92%]" />
          <Skeleton className="h-3 w-[88%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[75%]" />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>
      <aside className="saas-card space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </aside>
    </div>
  );
}
