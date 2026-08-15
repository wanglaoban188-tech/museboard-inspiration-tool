const startButton = document.getElementById("start");
const visibleButton = document.getElementById("visible");
const status = document.getElementById("status");
const serverUrlInput = document.getElementById("serverUrl");
const saveServerButton = document.getElementById("saveServer");

const supportedSites = [
  "pinterest.",
  "pinterest.com",
  "amazon.",
  "huaban.com",
  "instagram."
];

chrome.storage.local.get(["museboardServerUrl"], data => {
  serverUrlInput.value = data.museboardServerUrl || "";
});

function normalizeServerUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const url = new URL(trimmed);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
  return url.origin;
}

function isSupportedUrl(url = "") {
  return supportedSites.some(site => url.includes(site));
}

async function sendMessage(tabId, type) {
  return chrome.tabs.sendMessage(tabId, { type });
}

async function injectCollector(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["collector.css"]
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["collector.js"]
  });
}

saveServerButton.addEventListener("click", () => {
  try {
    const normalized = normalizeServerUrl(serverUrlInput.value);
    chrome.storage.local.set({ museboardServerUrl: normalized }, () => {
      status.textContent = normalized ? `已保存：${normalized}` : "已清空网址，将使用本机地址";
    });
  } catch {
    status.textContent = "网址格式不正确，请填写 https:// 开头的正式网址";
  }
});

async function runCollector(type, loadingText, successText) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (!isSupportedUrl(tab.url || "")) {
    status.textContent = "当前网页不支持。请先打开 Pinterest、Amazon、花瓣或 Instagram 的图片页面。";
    return;
  }

  startButton.disabled = true;
  visibleButton.disabled = true;
  status.textContent = loadingText;

  try {
    let response;
    try {
      response = await sendMessage(tab.id, type);
    } catch {
      await injectCollector(tab.id);
      response = await sendMessage(tab.id, type);
    }

    const count = response?.count;
    status.textContent = typeof count === "number" ? `${successText}：${count} 张` : successText;
    setTimeout(() => window.close(), 1200);
  } catch {
    startButton.disabled = false;
    visibleButton.disabled = false;
    status.textContent = "启动失败：请刷新目标网页，或重新加载 Museboard 扩展后再试。";
  }
}

visibleButton.addEventListener("click", () => {
  runCollector("MUSEBOARD_COLLECT_VISIBLE", "正在采集当前页可见图片...", "已发送到 Museboard");
});

startButton.addEventListener("click", () => {
  runCollector("MUSEBOARD_START_BATCH", "正在启动手动批量选择...", "手动选择已开启，请回到网页点选图片");
});
