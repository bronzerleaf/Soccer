import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Skeleton className="h-6 w-28" />
      <SkeletonList count={4} />
    </main>
  );
}
