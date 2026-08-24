import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Skeleton className="h-3.5 w-24" />
      <div className="mt-4 rounded-[18px] border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="mt-3.5 h-14 rounded-xl" />
        <Skeleton className="mt-4 h-16 rounded-xl" />
        <Skeleton className="mt-4 h-12 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-24 rounded-[18px]" />
    </main>
  );
}
