import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12 pb-24">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <SkeletonList count={3} />
    </main>
  );
}
