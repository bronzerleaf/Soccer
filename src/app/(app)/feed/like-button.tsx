"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFeedPostLike as defaultToggle } from "./actions";

export function LikeButton({
  postId,
  likedByMe,
  likeCount,
  toggleAction,
  variant = "pill",
}: {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
  // Defaults to feed_posts' own toggle; roster_spot cards pass
  // toggleRosterPostLike instead — same optimistic-UI shell either way.
  toggleAction?: (postId: string) => Promise<void>;
  // "primary" is the same like/toggle, just styled and labeled as the
  // opportunity detail page's main CTA ("I'm Interested") rather than a
  // small social pill — no new backend, just a different presentation
  // of the exact same "families interested" signal.
  variant?: "pill" | "primary";
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
        await (toggleAction ?? defaultToggle)(postId);
        router.refresh();
      } catch {
        setOptimisticLiked(!nextLiked);
        setOptimisticCount((count) => count + (nextLiked ? -1 : 1));
      }
    });
  }

  if (variant === "primary") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
          optimisticLiked
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill={optimisticLiked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4"
        >
          <path d="M12 20s-7-4.35-9.5-8.5C.8 8.2 2.6 5 6 5c2 0 3.5 1.2 6 3.7C14.5 6.2 16 5 18 5c3.4 0 5.2 3.2 3.5 6.5C19 15.65 12 20 12 20Z" />
        </svg>
        {optimisticLiked ? "You're Interested" : "I'm Interested"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
        optimisticLiked
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 text-gray-600 hover:border-gray-400"
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
