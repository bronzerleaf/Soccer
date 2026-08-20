import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="mt-4 flex items-center gap-3.5">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-24 rounded-[18px]" />
      <Skeleton className="mt-4 h-16 rounded-[18px]" />
    </main>
  );
}
