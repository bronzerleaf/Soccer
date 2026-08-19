import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-6 w-40" />
      <div className="mt-6 flex-1 space-y-3">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="ml-auto h-8 w-1/2 rounded-lg" />
        <Skeleton className="h-14 w-3/4 rounded-lg" />
      </div>
      <Skeleton className="mt-6 h-16 w-full rounded-md" />
    </main>
  );
}
