"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark, Check, ChevronDown, Download, ExternalLink, Globe2, Grid2X2, Heart,
  ImagePlus, Languages, Library, Link2, Plus, Search, SlidersHorizontal, Sparkles, X
} from "lucide-react";

type Category = {
  productType: string;
  imageType: string;
  style: string;
  scene: string;
  usage: string;
};

type Result = {
  id: string;
  src: string;
  title: string;
  source: string;
  size: string;
  score: number;
  tags: string[];
  color: string;
  saved?: boolean;
  sourceUrl?: string;
  category?: Category;
};

type Source = {
  id: string;
  name: string;
  short: string;
  color: string;
  mode: "api" | "assisted";
  note: string;
  searchUrl: (query: string) => string;
};

const LIBRARY_KEY = "museboard.library.v2";

const sources: Source[] = [
  { id: "unsplash", name: "Unsplash", short: "U", color: "#222", mode: "api", note: "官方 API · 页内结果", searchUrl: q => `https://unsplash.com/s/photos/${encodeURIComponent(q)}` },
  { id: "pinterest", name: "Pinterest", short: "P", color: "#e60023", mode: "assisted", note: "站内搜索 · 批量采集", searchUrl: q => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}` },
  { id: "amazon", name: "Amazon", short: "a", color: "#ff9900", mode: "assisted", note: "商品搜索 · 批量采集", searchUrl: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { id: "huaban", name: "花瓣", short: "花", color: "#e94b4b", mode: "assisted", note: "站内搜索 · 批量采集", searchUrl: q => `https://huaban.com/search/?q=${encodeURIComponent(q)}` },
  { id: "instagram", name: "Instagram", short: "◎", color: "#c13584", mode: "assisted", note: "需登录 · 批量采集", searchUrl: q => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}` }
];

const initialResults: Result[] = [
  { id: "1", src: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80", title: "柔光皮革手提包场景", source: "Unsplash", size: "2400 × 3000", score: 96, tags: ["女士包", "自然光", "奶油风"], color: "#d8c4ad" },
  { id: "2", src: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80", title: "棕色皮革托特包", source: "Unsplash", size: "2000 × 2500", score: 93, tags: ["皮革", "白底图", "商业摄影"], color: "#8b5d43" },
  { id: "3", src: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80", title: "极简包袋陈列", source: "Unsplash", size: "1920 × 2400", score: 91, tags: ["极简", "产品图", "高级感"], color: "#c6b7aa" },
  { id: "4", src: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80", title: "城市生活方式场景", source: "Unsplash", size: "2268 × 3024", score: 88, tags: ["欧美风", "街拍", "生活方式"], color: "#9b806b" },
  { id: "5", src: "https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=800&q=80", title: "暖调包袋细节", source: "Unsplash", size: "2000 × 3000", score: 86, tags: ["细节图", "暖色", "材质"], color: "#b27a55" },
  { id: "6", src: "https://images.unsplash.com/photo-1564422170194-896b89110ef8?auto=format&fit=crop&w=800&q=80", title: "黑色包袋品牌视觉", source: "Unsplash", size: "2400 × 3000", score: 84, tags: ["黑色", "品牌感", "广告图"], color: "#292725" },
  { id: "7", src: "https://images.unsplash.com/photo-1585488434455-1e7b6b3a2074?auto=format&fit=crop&w=800&q=80", title: "粉色小包静物构图", source: "Unsplash", size: "1800 × 2400", score: 82, tags: ["粉色", "静物", "社媒图"], color: "#d9aaa6" },
  { id: "8", src: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80", title: "经典皮革包白底参考", source: "Unsplash", size: "2048 × 2731", score: 80, tags: ["白底", "主图", "皮革"], color: "#84604f" }
].map(autoClassify);

const filters = ["全部结果", "高相似度", "白底产品图", "场景图", "高级品牌感"];

const dictionary: Array<[string, string]> = [
  ["找", "search for"], ["同类型", "same product type"], ["不同颜色", "different colors"], ["钱包", "wallet"],
  ["女士钱包", "women wallet"], ["包包", "bag"], ["手提包", "handbag"], ["托特包", "tote bag"],
  ["证件扣", "badge reel"], ["手机挂绳", "phone lanyard"], ["地垫", "floor mat"], ["枕套", "pillow cover"],
  ["厨房毛巾", "kitchen towel"], ["白底", "white background"], ["主图", "main image"], ["精修图", "retouched product photo"],
  ["场景图", "lifestyle scene"], ["细节图", "detail shot"], ["功能图", "feature image"], ["包装图", "packaging photo"],
  ["品牌故事图", "brand story image"], ["亚马逊套图", "Amazon listing image set"], ["同款不同角度", "same item different angles"],
  ["高级品牌感", "premium brand style"], ["高级", "premium"], ["简约", "minimal"], ["奶油风", "cream aesthetic"],
  ["欧美风", "European and American style"], ["自然光", "natural light"], ["商业摄影", "commercial photography"],
  ["INS风", "Instagram style"], ["奢华感", "luxury feel"], ["厨房", "kitchen"], ["浴室", "bathroom"],
  ["卧室", "bedroom"], ["街拍", "street style"], ["办公室", "office"], ["礼盒", "gift box"],
  ["节日送礼", "holiday gift"], ["米白", "off-white"], ["奶油色", "cream color"], ["浅粉", "light pink"],
  ["浅紫", "light purple"], ["棕色", "brown"], ["黑色", "black"], ["金色", "gold"],
  ["广告图", "ad creative"], ["社媒图", "social media image"], ["A+页面", "Amazon A+ content"]
];

function translateToEnglish(text: string) {
  let output = text.trim();
  const sorted = [...dictionary].sort((a, b) => b[0].length - a[0].length);
  for (const [zh, en] of sorted) output = output.split(zh).join(en);
  output = output
    .replace(/[，。；、]/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
  return output || text;
}

function includesAny(text: string, words: string[]) {
  return words.some(word => text.toLowerCase().includes(word.toLowerCase()));
}

function autoClassify(result: Result): Result {
  const text = `${result.title} ${result.tags.join(" ")} ${result.source}`.toLowerCase();
  const category: Category = {
    productType: includesAny(text, ["wallet", "钱包"]) ? "钱包"
      : includesAny(text, ["bag", "handbag", "tote", "包"]) ? "包袋"
      : includesAny(text, ["mat", "地垫"]) ? "地垫"
      : includesAny(text, ["pillow", "枕套"]) ? "枕套"
      : includesAny(text, ["towel", "毛巾"]) ? "厨房毛巾"
      : includesAny(text, ["lanyard", "挂绳"]) ? "手机挂绳"
      : "待确认",
    imageType: includesAny(text, ["white background", "白底", "主图"]) ? "白底产品图"
      : includesAny(text, ["detail", "细节", "材质"]) ? "细节图"
      : includesAny(text, ["packaging", "包装"]) ? "包装图"
      : includesAny(text, ["a+", "brand story", "品牌故事"]) ? "A+图"
      : includesAny(text, ["scene", "lifestyle", "街拍", "生活方式", "自然光", "场景"]) ? "场景图"
      : "产品参考图",
    style: includesAny(text, ["premium", "高级", "brand", "品牌"]) ? "高级品牌感"
      : includesAny(text, ["minimal", "极简", "简约"]) ? "简约"
      : includesAny(text, ["cream", "奶油"]) ? "奶油风"
      : includesAny(text, ["european", "american", "欧美"]) ? "欧美风"
      : includesAny(text, ["luxury", "奢华"]) ? "奢华感"
      : "通用电商风",
    scene: includesAny(text, ["kitchen", "厨房"]) ? "厨房"
      : includesAny(text, ["bathroom", "浴室"]) ? "浴室"
      : includesAny(text, ["bedroom", "卧室"]) ? "卧室"
      : includesAny(text, ["street", "街拍"]) ? "街拍"
      : includesAny(text, ["office", "办公室"]) ? "办公室"
      : includesAny(text, ["gift", "礼盒", "holiday", "节日"]) ? "礼盒/送礼"
      : "通用场景",
    usage: includesAny(text, ["main image", "主图", "white background", "白底"]) ? "亚马逊主图"
      : includesAny(text, ["a+", "brand story", "品牌故事"]) ? "A+页面"
      : includesAny(text, ["ad", "广告"]) ? "广告图"
      : includesAny(text, ["social", "社媒", "instagram"]) ? "社媒图"
      : "套图参考"
  };

  const categoryTags = [
    `产品:${category.productType}`,
    `类型:${category.imageType}`,
    `风格:${category.style}`,
    `场景:${category.scene}`,
    `用途:${category.usage}`
  ];

  return {
    ...result,
    category,
    tags: Array.from(new Set([...result.tags, ...categoryTags]))
  };
}

function mergeResults(base: Result[], incoming: Result[]) {
  const seen = new Set<string>();
  return [...incoming, ...base].filter(item => {
    const key = item.id || `${item.src}-${item.sourceUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const originalQueryRef = useRef("找高级品牌感的女士钱包场景图");
  const [query, setQuery] = useState("找高级品牌感的女士钱包场景图");
  const [queryLang, setQueryLang] = useState<"zh" | "en">("zh");
  const [preview, setPreview] = useState<string | null>(null);
  const [active, setActive] = useState("全部结果");
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Result[]>(initialResults);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState("");
  const [detail, setDetail] = useState<Result | null>(null);
  const [view, setView] = useState<"search" | "library">("search");
  const [selectedSources, setSelectedSources] = useState(sources.map(source => source.id));
  const [sourceTasks, setSourceTasks] = useState(false);
  const [collectorOpen, setCollectorOpen] = useState(false);
  const [collectForm, setCollectForm] = useState({ imageUrl: "", sourceUrl: "", title: "", source: "Pinterest" });
  const [collectError, setCollectError] = useState("");
  const [lastSync, setLastSync] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]") as Result[];
      if (Array.isArray(saved) && saved.length) {
        setResults(current => mergeResults(current, saved.map(item => autoClassify({ ...item, saved: true }))));
      }
    } catch {}
    setLibraryLoaded(true);
  }, []);

  useEffect(() => {
    if (!libraryLoaded) return;
    const saved = results.filter(result => result.saved).map(autoClassify);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(saved));
  }, [results, libraryLoaded]);

  useEffect(() => {
    const sync = async () => {
      try {
        const response = await fetch(`/api/collect?after=${lastSync}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as {
          items: Array<{ id: string; imageUrl: string; sourceUrl: string; title: string; source: string; width?: number; height?: number; createdAt: number; }>;
        };
        if (!data.items.length) return;

        const incoming: Result[] = data.items.map(item => autoClassify({
          id: item.id,
          src: item.imageUrl,
          title: item.title || "网页采集图片",
          source: item.source,
          size: item.width && item.height ? `${item.width} × ${item.height}` : "待分析",
          score: 100,
          tags: ["浏览器采集", "待 AI 分析"],
          color: "#c9b7a6",
          saved: true,
          sourceUrl: item.sourceUrl
        }));

        setResults(current => mergeResults(current, incoming));
        setLastSync(Math.max(...data.items.map(item => item.createdAt), lastSync));
      } catch {}
    };

    sync();
    const timer = setInterval(sync, 2500);
    return () => clearInterval(timer);
  }, [lastSync]);

  const visible = useMemo(() => {
    if (view === "library") return results.filter(result => result.saved);
    if (active === "高相似度") return results.filter(result => result.score >= 90);
    if (active === "白底产品图") return results.filter(result => result.category?.imageType === "白底产品图" || result.tags.some(tag => tag.includes("白底")));
    if (active === "场景图") return results.filter(result => result.category?.imageType === "场景图");
    if (active === "高级品牌感") return results.filter(result => result.category?.style === "高级品牌感");
    return results;
  }, [active, results, view]);

  const libraryCategories = useMemo(() => {
    const saved = results.filter(result => result.saved);
    return {
      products: Array.from(new Set(saved.map(item => item.category?.productType ?? "待确认"))),
      styles: Array.from(new Set(saved.map(item => item.category?.style ?? "通用电商风"))),
      usages: Array.from(new Set(saved.map(item => item.category?.usage ?? "套图参考")))
    };
  }, [results]);

  function pickFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  function toggleLanguage() {
    if (queryLang === "zh") {
      originalQueryRef.current = query;
      setQuery(translateToEnglish(query));
      setQueryLang("en");
    } else {
      setQuery(originalQueryRef.current);
      setQueryLang("zh");
    }
  }

  async function runSearch() {
    setSearching(true);
    setSourceTasks(false);
    setSearchNote(preview ? "已启用参考图相似搜索：正在结合图片视觉特征和文字需求。" : "未上传参考图：当前按文字需求搜索。");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          referenceImageUrl: preview || undefined,
          modes: ["similar", "style", "product", "scene"],
          limit: 30
        })
      });

      if (response.ok) {
        const data = await response.json() as {
          results?: Array<{
            provider: string; providerItemId: string; title: string; thumbnailUrl: string;
            sourcePageUrl: string; width?: number; height?: number; finalScore: number; tags?: string[];
          }>;
        };

        if (data.results?.length) {
          setResults(data.results.map((item, index) => autoClassify({
            id: `${item.provider}-${item.providerItemId}`,
            src: item.thumbnailUrl,
            title: item.title || "相似参考图",
            source: item.provider,
            size: item.width && item.height ? `${item.width} × ${item.height}` : "未知尺寸",
            score: Math.round((item.finalScore || (0.95 - index * 0.02)) * 100),
            tags: item.tags?.length ? item.tags : ["相似图", "参考图"],
            color: "#c9b7a6",
            sourceUrl: item.sourcePageUrl
          })));
        } else if (preview) {
          setResults(initialResults.map((item, index) => autoClassify({
            ...item,
            score: Math.max(78, 98 - index * 3),
            tags: Array.from(new Set(["参考图相似", ...item.tags]))
          })));
        }
      }
    } finally {
      setSearching(false);
      setSourceTasks(true);
    }
  }

  function saveSelected() {
    setResults(items => items.map(result => selected.includes(result.id) ? autoClassify({ ...result, saved: true }) : result));
    setSelected([]);
  }

  function toggleSource(id: string) {
    setSelectedSources(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  }

  function collectImage() {
    setCollectError("");
    try {
      const image = new URL(collectForm.imageUrl);
      const page = new URL(collectForm.sourceUrl);
      if (!["http:", "https:"].includes(image.protocol) || !["http:", "https:"].includes(page.protocol)) throw new Error();
    } catch {
      setCollectError("请填写有效的图片链接和原页面链接（http/https）。");
      return;
    }

    setResults(items => [autoClassify({
      id: `collected-${Date.now()}`,
      src: collectForm.imageUrl,
      title: collectForm.title.trim() || "新采集的灵感图片",
      source: collectForm.source,
      size: "待分析",
      score: 100,
      tags: ["手动采集", "待 AI 分析"],
      color: "#c9b7a6",
      saved: true,
      sourceUrl: collectForm.sourceUrl
    }), ...items]);
    setCollectorOpen(false);
    setCollectForm({ imageUrl: "", sourceUrl: "", title: "", source: "Pinterest" });
  }

  return (
    <main>
      <header>
        <button className="brand" onClick={() => setView("search")}>
          <span className="brandmark"><Sparkles size={19}/></span>
          <span>Museboard</span><em>灵感搜集器</em>
        </button>
        <nav>
          <button className={view === "search" ? "nav-active" : ""} onClick={() => setView("search")}><Search size={17}/> 灵感搜索</button>
          <button className={view === "library" ? "nav-active" : ""} onClick={() => setView("library")}><Library size={17}/> 我的灵感库 <b>{results.filter(result => result.saved).length}</b></button>
        </nav>
        <div className="avatar">M</div>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> AI 驱动的视觉灵感发现</div>
        <h1>{view === "search" ? <>从一张图，找到<span>无限灵感</span></> : <>你的<span>灵感收藏</span></>}</h1>
        <p>{view === "search" ? "上传参考图，结合你的设计需求，从多个公开来源发现同款、同风格与同场景素材。" : "保存后的灵感会保留在本机浏览器里，刷新或重新打开也不会丢。"}</p>
      </section>

      {view === "search" && <section className="search-panel">
        <div className="upload-card" onClick={() => inputRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); pickFile(event.dataTransfer.files[0]); }}>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={event => pickFile(event.target.files?.[0])}/>
          {preview ? <>
            <img src={preview} alt="参考图"/>
            <button className="clear" onClick={event => { event.stopPropagation(); setPreview(null); }}><X size={15}/></button>
          </> : <>
            <span className="upload-icon"><ImagePlus size={24}/></span>
            <strong>上传参考图片</strong>
            <small>拖拽图片到这里，或点击选择</small>
            <i>JPG · PNG · WEBP，最大 15MB</i>
          </>}
        </div>

        <div className="prompt-area">
          <label>描述你想找的灵感 <span>可选</span></label>
          <div className="query-tools">
            <button type="button" onClick={toggleLanguage}><Languages size={14}/> {queryLang === "zh" ? "中文转英文" : "切回中文"}</button>
            <span>{queryLang === "en" ? "当前关键词会用英文搜索，更适合 Pinterest / Amazon / Unsplash。" : "输入中文后可一键切换成英文关键词。"}</span>
          </div>
          <textarea value={query} onChange={event => { setQuery(event.target.value); if (queryLang === "zh") originalQueryRef.current = event.target.value; }} placeholder="例如：找同类型但不同颜色的钱包图"/>
          <div className="suggestions">
            {["同款不同角度", "白底精修图", "欧美风场景", "亚马逊套图"].map(item => <button key={item} onClick={() => { setQuery(item); setQueryLang("zh"); originalQueryRef.current = item; }}>+ {item}</button>)}
          </div>
          <div className="source-label"><span>选择搜图网站</span><small>已选 {selectedSources.length} 个</small></div>
          <div className="source-picker">
            {sources.map(source => <button type="button" key={source.id} className={selectedSources.includes(source.id) ? "selected" : ""} onClick={() => toggleSource(source.id)}>
              <i style={{ background: source.color }}>{source.short}</i>
              <span>{source.name}<small>{source.mode === "api" ? "直连" : "辅助"}</small></span>
              <b>{selectedSources.includes(source.id) && <Check size={12}/>}</b>
            </button>)}
          </div>
          <button className="search-button" onClick={runSearch} disabled={searching}>
            {searching ? <span className="spinner"/> : <Search size={18}/>} {searching ? "正在寻找相似灵感…" : "开始搜索"}
          </button>
          {searchNote && <div className="extension-help"><strong>搜索状态</strong><span>{searchNote}</span></div>}
        </div>
      </section>}

      {view === "library" && <section className="library-summary">
        <strong>自动分类</strong>
        <span>产品：{libraryCategories.products.join(" / ") || "暂无"}</span>
        <span>风格：{libraryCategories.styles.join(" / ") || "暂无"}</span>
        <span>用途：{libraryCategories.usages.join(" / ") || "暂无"}</span>
      </section>}

      {view === "search" && sourceTasks && <section className="source-tasks">
        <div className="source-task-head">
          <div><Globe2 size={18}/><span><strong>多网站搜索已准备好</strong><small>直连来源在下方显示；其他网站打开搜索后，可用插件批量选择图片并采集回来。</small></span></div>
          <button className="collect-primary" onClick={() => setCollectorOpen(true)}><Plus size={15}/> 手动采集图片</button>
        </div>
        <div className="task-grid">
          {sources.filter(source => selectedSources.includes(source.id)).map(source => <div className="task" key={source.id}>
            <i style={{ background: source.color }}>{source.short}</i>
            <span><strong>{source.name}</strong><small>{source.note}</small></span>
            {source.mode === "api" ? <em><Check size={12}/> 已聚合</em> : <a href={source.searchUrl(query)} target="_blank" rel="noreferrer">打开并采集 <ExternalLink size={13}/></a>}
          </div>)}
        </div>
        <div className="compliance-note">仅采集你有权保存的图片；系统会同时记录原页面链接。受保护、禁止下载或授权不明的内容请仅保存链接。</div>
        <div className="extension-help"><strong>批量采集方法</strong><span>安装浏览器采集助手 → 打开目标网站 → 点击扩展图标 → 开始批量选择 → 连续点选多张图片 → 点击右下角“完成采集”。Museboard 会自动接收并显示。</span></div>
      </section>}

      <section className="results-head">
        <div><h2>{view === "library" ? "已收藏灵感" : "搜索结果"}</h2><span>共 {visible.length} 张图片</span></div>
        <div className="head-actions">
          {selected.length > 0 && <>
            <span>已选 {selected.length} 项</span>
            <button className="save" onClick={saveSelected}><Bookmark size={15}/> 保存到灵感库</button>
            <button><Download size={15}/> 下载</button>
          </>}
          <button><SlidersHorizontal size={15}/> 筛选</button><button className="icon-only"><Grid2X2 size={17}/></button>
        </div>
      </section>

      <section className="filter-row">
        {filters.map(filter => <button className={active === filter ? "active" : ""} key={filter} onClick={() => setActive(filter)}>{filter}</button>)}
        <button className="more-filter">更多筛选 <ChevronDown size={14}/></button>
      </section>

      {visible.length ? <section className="masonry">
        {visible.map(item => <article className="card" key={item.id} onClick={() => setDetail(item)}>
          <div className="image-wrap">
            <img src={item.src} alt={item.title}/>
            <button className={`select ${selected.includes(item.id) ? "checked" : ""}`} onClick={event => { event.stopPropagation(); setSelected(items => items.includes(item.id) ? items.filter(id => id !== item.id) : [...items, item.id]); }}>{selected.includes(item.id) && <Check size={15}/>}</button>
            <span className="score">{item.score}% 相似</span>
            <button className={`heart ${item.saved ? "liked" : ""}`} onClick={event => { event.stopPropagation(); setResults(items => items.map(result => result.id === item.id ? autoClassify({ ...result, saved: !result.saved }) : result)); }}><Heart size={17} fill={item.saved ? "currentColor" : "none"}/></button>
          </div>
          <div className="card-info">
            <h3>{item.title}</h3>
            {item.category && <div className="category-line">{item.category.productType} · {item.category.imageType} · {item.category.usage}</div>}
            <div className="tags">{item.tags.slice(0, 7).map(tag => <span key={tag}>{tag}</span>)}</div>
            <footer><span>{item.source}</span><small>{item.size}</small></footer>
          </div>
        </article>)}
      </section> : <section className="empty"><Library size={38}/><h3>灵感库还是空的</h3><p>在搜索结果中选中喜欢的图片并保存。</p><button onClick={() => setView("search")}>去寻找灵感</button></section>}

      {detail && <div className="modal-backdrop" onClick={() => setDetail(null)}>
        <div className="modal" onClick={event => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setDetail(null)}><X/></button>
          <img src={detail.src} alt={detail.title}/>
          <div className="modal-content">
            <div className="eyebrow">AI 图片分析</div><h2>{detail.title}</h2>
            <p>可作为电商设计参考：观察图片的光线、构图、背景、材质呈现与品牌调性，再转化为原创拍摄或 AI 生图方案。</p>
            {detail.category && <>
              <h4>自动分类</h4>
              <div className="prompt-box">产品：{detail.category.productType} / 图片类型：{detail.category.imageType} / 风格：{detail.category.style} / 场景：{detail.category.scene} / 用途：{detail.category.usage}</div>
            </>}
            <h4>标签</h4><div className="tags">{detail.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
            <h4>设计参考点</h4><p>适合作为亚马逊套图、品牌故事模块、社媒广告或产品详情页参考。商用前请确认版权或重新制作原创图片。</p>
            <h4>AI 生图提示词</h4><div className="prompt-box">premium ecommerce product photography, soft natural light, clean composition, detailed material texture, brand style reference, high-end commercial visual</div>
            <div className="source-line"><span>来源：{detail.source}</span><span>{detail.size}</span></div>
            {detail.sourceUrl && <a className="origin-link" href={detail.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> 查看原始页面</a>}
            <button className="search-button" onClick={() => { setResults(items => items.map(result => result.id === detail.id ? autoClassify({ ...result, saved: true }) : result)); setDetail(null); }}><Bookmark size={17}/> 保存到灵感库</button>
          </div>
        </div>
      </div>}

      {collectorOpen && <div className="modal-backdrop" onClick={() => setCollectorOpen(false)}>
        <div className="collector" onClick={event => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setCollectorOpen(false)}><X/></button>
          <div className="collector-icon"><Link2 size={21}/></div>
          <h2>手动采集图片到灵感库</h2>
          <p>复制图片地址和它所在的页面地址。保存后会保留出处，方便日后追溯版权。</p>
          <label>来源网站<select value={collectForm.source} onChange={event => setCollectForm({ ...collectForm, source: event.target.value })}>
            {sources.filter(source => source.id !== "unsplash").map(source => <option key={source.id}>{source.name}</option>)}<option>其他网站</option>
          </select></label>
          <label>图片链接 <span>必填</span><input value={collectForm.imageUrl} onChange={event => setCollectForm({ ...collectForm, imageUrl: event.target.value })} placeholder="https://.../image.jpg"/></label>
          <label>原页面链接 <span>必填</span><input value={collectForm.sourceUrl} onChange={event => setCollectForm({ ...collectForm, sourceUrl: event.target.value })} placeholder="https://.../pin/product/post"/></label>
          <label>图片标题 <small>可选</small><input value={collectForm.title} onChange={event => setCollectForm({ ...collectForm, title: event.target.value })} placeholder="例如：暖棕色钱包生活方式场景"/></label>
          {collectError && <div className="collect-error">{collectError}</div>}
          <button className="search-button" onClick={collectImage}><Bookmark size={16}/> 保存并记录来源</button>
          <div className="collector-tip">更推荐使用浏览器插件批量选择图片；手动采集适合补录单张图片链接。</div>
        </div>
      </div>}

      <aside className="copyright">图片仅用于灵感参考，商用前请确认版权与授权范围</aside>
    </main>
  );
}
