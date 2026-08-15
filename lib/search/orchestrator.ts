import type { NormalizedSearchResult, SearchContext, SearchProvider } from "./types";

export class SearchOrchestrator {
  constructor(private readonly providers: SearchProvider[]) {}

  async search(context: SearchContext): Promise<{
    results: NormalizedSearchResult[];
    failures: Array<{ provider: string; reason: string }>;
  }> {
    const settled = await Promise.allSettled(
      this.providers.map(async provider => ({
        provider: provider.id,
        results: await provider.search(context)
      }))
    );

    const results: NormalizedSearchResult[] = [];
    const failures: Array<{ provider: string; reason: string }> = [];

    settled.forEach((item, index) => {
      if (item.status === "fulfilled") {
        results.push(...item.value.results);
      } else {
        failures.push({
          provider: this.providers[index].id,
          reason: item.reason instanceof Error ? item.reason.message : "来源暂时不可用"
        });
      }
    });

    return {
      results: this.dedupe(results).sort((a, b) => b.finalScore - a.finalScore),
      failures
    };
  }

  private dedupe(results: NormalizedSearchResult[]) {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.sourcePageUrl.toLowerCase().replace(/[?#].*$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
