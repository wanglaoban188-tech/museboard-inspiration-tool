import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

type CollectedItem = {
  id: string;
  imageUrl: string;
  sourceUrl: string;
  title: string;
  source: string;
  width?: number;
  height?: number;
  createdAt: number;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "collections.json");

async function readItems(): Promise<CollectedItem[]> {
  try {
    return JSON.parse(await readFile(dataFile, "utf8")) as CollectedItem[];
  } catch {
    return [];
  }
}

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return response;
}

function normalizeItem(body: Partial<CollectedItem>): CollectedItem | null {
  let image: URL;
  let sourcePage: URL;

  try {
    image = new URL(body.imageUrl ?? "");
    sourcePage = new URL(body.sourceUrl ?? "");
    if (!["http:", "https:"].includes(image.protocol)) throw new Error("invalid image url");
    if (!["http:", "https:"].includes(sourcePage.protocol)) throw new Error("invalid source url");
  } catch {
    return null;
  }

  const source = sourcePage.hostname.replace(/^www\./, "");

  return {
    id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: image.href,
    sourceUrl: sourcePage.href,
    title: String(body.title || "").slice(0, 200),
    source: String(body.source || source).slice(0, 50),
    width: Number(body.width) || undefined,
    height: Number(body.height) || undefined,
    createdAt: Date.now()
  };
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const after = Number(request.nextUrl.searchParams.get("after") ?? 0);
  const items = (await readItems()).filter(item => item.createdAt > after).slice(-100);
  return cors(NextResponse.json({ items }));
}

export async function POST(request: NextRequest) {
  const body = await request.json() as Partial<CollectedItem> & {
    items?: Partial<CollectedItem>[];
  };

  const incoming = Array.isArray(body.items) ? body.items : [body];
  const existing = await readItems();
  const known = new Set(existing.map(item => `${item.imageUrl}@@${item.sourceUrl}`));
  const created: CollectedItem[] = [];

  for (const raw of incoming.slice(0, 80)) {
    const item = normalizeItem(raw);
    if (!item) continue;

    const key = `${item.imageUrl}@@${item.sourceUrl}`;
    if (known.has(key)) continue;

    known.add(key);
    created.push(item);
  }

  if (!created.length) {
    if (Array.isArray(body.items)) {
      return cors(NextResponse.json({ items: [], duplicate: true }));
    }

    const duplicate = existing.find(
      item => item.imageUrl === body.imageUrl && item.sourceUrl === body.sourceUrl
    );
    if (duplicate) return cors(NextResponse.json({ item: duplicate, duplicate: true }));

    return cors(NextResponse.json({ error: "图片或来源链接无效" }, { status: 400 }));
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify([...existing.slice(-999), ...created], null, 2), "utf8");

  if (Array.isArray(body.items)) {
    return cors(NextResponse.json({ items: created }, { status: 201 }));
  }

  return cors(NextResponse.json({ item: created[0] }, { status: 201 }));
}
