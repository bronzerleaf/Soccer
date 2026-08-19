// Best-effort video link previews. A player's video_links are just URLs
// (we never host video — see CLAUDE.md), so any richer preview has to
// come from asking the provider. Known providers get a direct, documented
// oEmbed endpoint; anything else falls back to the oEmbed spec's own
// auto-discovery (a <link type="application/json+oembed"> tag on the
// page). Any failure at any step — unknown provider, network error,
// timeout, no thumbnail in the response — just means no preview; the
// caller always falls back to a branded (but thumbnail-less) tile via
// detectPlatform() in ./platform.ts. This never blocks or breaks the
// page it's rendered on.

export type OEmbedPreview = {
  thumbnailUrl: string;
  title: string;
  providerName?: string;
};

const KNOWN_ENDPOINTS: Record<string, (url: string) => string> = {
  "youtube.com": (url) =>
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  "youtu.be": (url) =>
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  "vimeo.com": (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
};

// Instagram's oEmbed endpoint has required an authenticated Meta developer
// token since 2020 — there's no public, unauthenticated way to fetch a real
// thumbnail from an Instagram link anymore. Skip the network round trip
// entirely rather than waiting out a guaranteed-401 timeout; the caller
// falls back to a branded (not photo) tile via detectPlatform() instead.
const NO_OEMBED_HOSTS = new Set(["instagram.com"]);

const FETCH_TIMEOUT_MS = 4000;

export async function fetchOEmbedPreview(videoUrl: string): Promise<OEmbedPreview | null> {
  try {
    const host = new URL(videoUrl).hostname.replace(/^www\./, "");
    if (
      Array.from(NO_OEMBED_HOSTS).some((h) => host === h || host.endsWith(`.${h}`))
    ) {
      return null;
    }

    const knownKey = Object.keys(KNOWN_ENDPOINTS).find(
      (key) => host === key || host.endsWith(`.${key}`)
    );
    const endpoint = knownKey
      ? KNOWN_ENDPOINTS[knownKey](videoUrl)
      : await discoverOEmbedEndpoint(videoUrl);

    if (!endpoint) return null;

    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data.thumbnail_url !== "string") return null;

    return {
      thumbnailUrl: data.thumbnail_url,
      title: typeof data.title === "string" ? data.title : "Video",
      providerName: typeof data.provider_name === "string" ? data.provider_name : undefined,
    };
  } catch {
    return null;
  }
}

async function discoverOEmbedEndpoint(pageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pageUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OpenRosterBot/1.0)" },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const match =
      html.match(/<link[^>]+type=["']application\/json\+oembed["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/json\+oembed["']/i);

    if (!match) return null;
    return new URL(match[1], pageUrl).toString();
  } catch {
    return null;
  }
}
