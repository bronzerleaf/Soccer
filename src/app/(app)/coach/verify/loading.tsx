import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-8 h-40 rounded-[18px]" />
    </main>
  );
}
