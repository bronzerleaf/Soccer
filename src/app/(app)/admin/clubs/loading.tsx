import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="mt-3 h-6 w-28" />
      <Skeleton className="mt-2 h-3.5 w-56" />
      <div className="mt-8 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
