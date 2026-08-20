import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Skeleton className="h-3.5 w-28" />
      <div className="mt-4 rounded-[18px] border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-6 h-32 rounded-[18px]" />
    </main>
  );
}
