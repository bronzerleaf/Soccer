"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFeedPostLike } from "./actions";

export function LikeButton({
  postId,
  likedByMe,
  likeCount,
}: {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticLiked, setOptimisticLiked] = useState(likedByMe);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);

  function handleClick() {
    const nextLiked = !optimisticLiked;
    setOptimisticLiked(nextLiked);
    setOptimisticCount((count) => count + (nextLiked ? 1 : -1));
    startTransition(async () => {
      try {
        await toggleFeedPostLike(postId);
        router.refresh();
      } catch {
        setOptimisticLiked(!nextLiked);
        setOptimisticCount((count) => count + (nextLiked ? -1 : 1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
        optimisticLiked
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 text-slate-600 hover:border-slate-400"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={optimisticLiked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-3.5 w-3.5"
      >
        <path d="M12 20s-7-4.35-9.5-8.5C.8 8.2 2.6 5 6 5c2 0 3.5 1.2 6 3.7C14.5 6.2 16 5 18 5c3.4 0 5.2 3.2 3.5 6.5C19 15.65 12 20 12 20Z" />
      </svg>
      {optimisticCount > 0 ? optimisticCount : "Like"}
    </button>
  );
}
