import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="mt-3 h-6 w-32" />
      <Skeleton className="mt-2 h-3.5 w-64" />
      <SkeletonList count={4} />
    </main>
  );
}
