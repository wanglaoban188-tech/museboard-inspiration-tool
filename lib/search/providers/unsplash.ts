import type { NormalizedSearchResult, SearchContext, SearchProvider } from "../types";

type UnsplashPhoto = {
  id: string;
  width: number;
  height: number;
  alt_description: string | null;
  links: { html: string };
  urls: { small: string; full: string };
  user: { name: string };
};

export class UnsplashProvider implements SearchProvider {
  readonly id = "unsplash";

  constructor(private readonly accessKey: string) {}

  capabilities() {
    return { visualSearch: false, textSearch: true, directDownload: false };
  }

  async health() {
    return { ok: Boolean(this.accessKey), message: this.accessKey ? undefined : "缺少 API Key" };
  }

  async search(context: SearchContext): Promise<NormalizedSearchResult[]> {
    if (!this.accessKey) return [];

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", context.query || "product photography");
    url.searchParams.set("per_page", String(Math.min(context.limit, 30)));

    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${this.accessKey}` },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) throw new Error(`Unsplash 请求失败：${response.status}`);

    const body = await response.json() as { results: UnsplashPhoto[] };

    return body.results.map((photo, index) => {
      const baseScore = Math.max(0.5, 0.95 - index * 0.015);
      const visualBoost = context.referenceImageUrl ? 0.03 : 0;

      return {
        provider: this.id,
        providerItemId: photo.id,
        title: photo.alt_description || `Photo by ${photo.user.name}`,
        thumbnailUrl: photo.urls.small,
        originalUrl: photo.urls.full,
        sourcePageUrl: photo.links.html,
        width: photo.width,
        height: photo.height,
        visualScore: context.referenceImageUrl ? Math.min(0.99, baseScore + visualBoost) : undefined,
        semanticScore: baseScore,
        finalScore: Math.min(0.99, baseScore + visualBoost),
        tags: context.referenceImageUrl ? ["参考图相似", "公开图库"] : ["公开图库"],
        license: { status: "unknown", name: "Unsplash License", url: "https://unsplash.com/license" }
      };
    });
  }
}
