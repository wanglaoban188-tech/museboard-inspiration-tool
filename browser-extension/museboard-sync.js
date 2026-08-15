(function () {
  const LIBRARY_KEY = "museboard.library.v2";

  function classify(item) {
    const text = `${item.title || ""} ${item.source || ""}`.toLowerCase();
    return {
      productType: text.includes("wallet") || text.includes("钱包") ? "钱包"
        : text.includes("bag") || text.includes("gift") || text.includes("礼盒") ? "包包"
        : "待确认",
      imageType: text.includes("white") || text.includes("白底") ? "白底产品图"
        : text.includes("pack") || text.includes("gift") || text.includes("包装") || text.includes("礼盒") ? "包装图"
        : "场景图",
      style: text.includes("luxury") || text.includes("premium") || text.includes("高级") ? "高级品牌感" : "通用电商风",
      scene: text.includes("gift") || text.includes("礼") ? "礼盒" : "待确认",
      usage: "套图参考"
    };
  }

  function toResult(item) {
    const category = classify(item);
    return {
      id: item.id || `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      src: item.imageUrl,
      title: item.title || "浏览器采集图片",
      source: item.source || "Browser",
      size: item.width && item.height ? `${item.width} × ${item.height}` : "待分析",
      score: 100,
      tags: [
        "浏览器采集",
        `产品:${category.productType}`,
        `类型:${category.imageType}`,
        `风格:${category.style}`,
        `场景:${category.scene}`,
        `用途:${category.usage}`
      ],
      color: "#c9b7a6",
      saved: true,
      sourceUrl: item.sourceUrl,
      category
    };
  }

  function mergeIntoLibrary(items) {
    if (!items.length) return 0;

    let library = [];
    try {
      const raw = localStorage.getItem(LIBRARY_KEY);
      library = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(library)) library = [];
    } catch {
      library = [];
    }

    const known = new Set(library.map(item => `${item.src}@@${item.sourceUrl || ""}`));
    const incoming = [];

    for (const item of items) {
      if (!item?.imageUrl || !item?.sourceUrl) continue;
      const key = `${item.imageUrl}@@${item.sourceUrl}`;
      if (known.has(key)) continue;
      known.add(key);
      incoming.push(toResult(item));
    }

    if (!incoming.length) return 0;

    localStorage.setItem(LIBRARY_KEY, JSON.stringify([...incoming, ...library].slice(0, 1000)));
    window.dispatchEvent(new CustomEvent("museboard:library-updated", { detail: { count: incoming.length } }));
    return incoming.length;
  }

  chrome.storage.local.get(["museboardPendingItems"], data => {
    const pending = Array.isArray(data.museboardPendingItems) ? data.museboardPendingItems : [];
    const imported = mergeIntoLibrary(pending);
    if (imported > 0) {
      chrome.storage.local.set({ museboardPendingItems: [] });
    }
  });
})();
