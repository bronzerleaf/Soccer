import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="mt-4 flex items-center gap-3.5">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-6 h-24 rounded-[18px]" />
      <Skeleton className="mt-6 h-32 rounded-[18px]" />
    </main>
  );
}
