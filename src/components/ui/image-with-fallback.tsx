"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

// Wraps a plain <img> with a real broken-image fallback -- not just "no
// URL provided" (every avatar/thumbnail already degrades to initials or
// a platform glyph for that), but "a URL was provided and it failed to
// load" (an expired signed URL, a dead oEmbed thumbnail, a network
// blip). Without this, a failed load renders the browser's broken-image
// icon instead of the same fallback we already show for "no photo."
export function ImageWithFallback({
  src,
  alt,
  className,
  style,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
