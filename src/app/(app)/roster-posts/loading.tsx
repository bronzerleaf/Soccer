import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-3.5 w-56" />
      <div className="mt-6 flex gap-4">
        <Skeleton className="h-16 w-24 rounded-md" />
        <Skeleton className="h-16 w-24 rounded-md" />
      </div>
      <SkeletonList count={3} />
    </main>
  );
}
