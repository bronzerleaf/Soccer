// Brand-adjacent styling for a link tile when we don't have (or can't fetch)
// a real oEmbed thumbnail — so a gallery tile always looks like a deliberate
// "post" instead of a bare URL, even on failure. Colors/shapes are generic,
// not the platforms' actual logos.

export type PlatformKind = "photo" | "video" | "link";

export type Platform = {
  name: string;
  gradient: string;
  kind: PlatformKind;
};

const PLATFORMS: Record<string, Platform> = {
  "instagram.com": {
    name: "Instagram",
    gradient: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)",
    kind: "photo",
  },
  "youtube.com": {
    name: "YouTube",
    gradient: "linear-gradient(135deg,#ff4d4d,#b91c1c)",
    kind: "video",
  },
  "youtu.be": {
    name: "YouTube",
    gradient: "linear-gradient(135deg,#ff4d4d,#b91c1c)",
    kind: "video",
  },
  "vimeo.com": {
    name: "Vimeo",
    gradient: "linear-gradient(135deg,#4dd2ff,#0369a1)",
    kind: "video",
  },
  "hudl.com": {
    name: "Hudl",
    gradient: "linear-gradient(135deg,#fb923c,#c2410c)",
    kind: "video",
  },
  "veo.co": {
    name: "Veo",
    gradient: "linear-gradient(135deg,#c084fc,#6d28d9)",
    kind: "video",
  },
};

const DEFAULT_PLATFORM: Platform = {
  name: "Link",
  gradient: "linear-gradient(135deg,#94a3b8,#475569)",
  kind: "link",
};

export function detectPlatform(url: string): Platform {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const key = Object.keys(PLATFORMS).find(
      (k) => host === k || host.endsWith(`.${k}`)
    );
    return key ? PLATFORMS[key] : DEFAULT_PLATFORM;
  } catch {
    return DEFAULT_PLATFORM;
  }
}
