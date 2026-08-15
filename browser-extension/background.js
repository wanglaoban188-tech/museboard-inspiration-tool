const fallbackEndpoints = [
  "http://127.0.0.1:3000/api/collect",
  "http://localhost:3000/api/collect"
];

function getConfiguredEndpoint() {
  return new Promise(resolve => {
    chrome.storage.local.get(["museboardServerUrl"], data => {
      const base = (data.museboardServerUrl || "").replace(/\/+$/, "");
      resolve(base ? `${base}/api/collect` : "");
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
        return await response.json();
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
  }

  throw new Error(lastError);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "MUSEBOARD_COLLECT_ITEMS") return;

  postItems(message.items || [])
    .then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error.message }));

  return true;
});
