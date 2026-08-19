import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-6 w-24" />
      <Skeleton className="mt-2 h-4 w-full" />
      <SkeletonList count={3} />
    </main>
  );
}
