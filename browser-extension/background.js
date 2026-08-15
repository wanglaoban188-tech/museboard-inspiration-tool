const fallbackEndpoints = [
  "https://museboard-inspiration-tool-v3.vercel.app/api/collect",
  "http://127.0.0.1:3000/api/collect",
  "http://localhost:3000/api/collect"
];

function getConfiguredEndpoint() {
  return new Promise(resolve => {
    chrome.storage.local.get(["museboardServerUrl"], data => {
      const base = (data.museboardServerUrl || "https://museboard-inspiration-tool-v3.vercel.app").replace(/\/+$/, "");
      resolve(base ? `${base}/api/collect` : "");
    });
  });
}

function rememberPendingItems(items) {
  return new Promise(resolve => {
    const normalized = (items || [])
      .filter(item => item?.imageUrl && item?.sourceUrl)
      .map(item => ({
        id: `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        imageUrl: item.imageUrl,
        sourceUrl: item.sourceUrl,
        title: item.title || "浏览器采集图片",
        source: item.source || "Browser",
        width: item.width,
        height: item.height,
        createdAt: Date.now()
      }));

    if (!normalized.length) {
      resolve();
      return;
    }

    chrome.storage.local.get(["museboardPendingItems"], data => {
      const existing = Array.isArray(data.museboardPendingItems) ? data.museboardPendingItems : [];
      const known = new Set(existing.map(item => `${item.imageUrl}@@${item.sourceUrl}`));
      const merged = [...existing];

      for (const item of normalized) {
        const key = `${item.imageUrl}@@${item.sourceUrl}`;
        if (!known.has(key)) {
          known.add(key);
          merged.push(item);
        }
      }

      chrome.storage.local.set({ museboardPendingItems: merged.slice(-500) }, resolve);
    });
  });
}

async function postItems(items) {
  const configured = await getConfiguredEndpoint();
  const endpoints = configured ? [configured, ...fallbackEndpoints] : fallbackEndpoints;
  let lastError = "unknown";

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });

      if (response.ok) {
        const data = await response.json();
        await rememberPendingItems(data.items?.length ? data.items : items);
        return data;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
  }

  await rememberPendingItems(items);
  return { items, offlineSaved: true, warning: lastError };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "MUSEBOARD_COLLECT_ITEMS") return;

  postItems(message.items || [])
    .then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error.message }));

  return true;
});
