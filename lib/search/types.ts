export type SearchMode = "similar" | "style" | "product" | "scene";

export type SearchContext = {
  query: string;
  referenceImageUrl?: string;
  modes: SearchMode[];
  limit: number;
};

export type NormalizedSearchResult = {
  provider: string;
  providerItemId: string;
  title: string;
  thumbnailUrl: string;
  sourcePageUrl: string;
  originalUrl?: string;
  width?: number;
  height?: number;
  visualScore?: number;
  semanticScore?: number;
  finalScore: number;
  tags: string[];
  license: { status: "commercial" | "editorial" | "unknown"; name?: string; url?: string };
};

export interface SearchProvider {
  readonly id: string;
  capabilities(): {
    visualSearch: boolean;
    textSearch: boolean;
    directDownload: boolean;
  };
  search(context: SearchContext): Promise<NormalizedSearchResult[]>;
  health(): Promise<{ ok: boolean; message?: string }>;
}
