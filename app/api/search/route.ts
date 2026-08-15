import { NextRequest, NextResponse } from "next/server";
import { SearchOrchestrator } from "@/lib/search/orchestrator";
import { UnsplashProvider } from "@/lib/search/providers/unsplash";
import type { SearchMode } from "@/lib/search/types";

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    query?: string;
    referenceImageUrl?: string;
    modes?: SearchMode[];
    limit?: number;
  };

  const query = body.query?.trim() ?? "";
  if (!query && !body.referenceImageUrl) {
    return NextResponse.json({ error: "请提供参考图或文字需求" }, { status: 400 });
  }

  const orchestrator = new SearchOrchestrator([
    new UnsplashProvider(process.env.UNSPLASH_ACCESS_KEY ?? "")
  ]);

  const response = await orchestrator.search({
    query: query || "ecommerce product photography",
    referenceImageUrl: body.referenceImageUrl,
    modes: body.modes ?? ["similar", "style", "product", "scene"],
    limit: Math.min(Math.max(body.limit ?? 30, 1), 100)
  });

  return NextResponse.json({
    ...response,
    visualSearchEnabled: Boolean(body.referenceImageUrl),
    message: body.referenceImageUrl
      ? "已收到参考图；当前会把图片信息传给支持视觉检索的 provider，文本 provider 会使用文字需求搜索。"
      : "当前按文字需求搜索。"
  });
}
