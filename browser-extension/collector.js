(() => {
  if (window.__museboardCollectorInstalled) return;
  window.__museboardCollectorInstalled = true;

  let active = false;
  let hovered = null;
  const selected = new Map();

  function sourceName() {
    const host = location.hostname;
    if (host.includes("pinterest")) return "Pinterest";
    if (host.includes("amazon")) return "Amazon";
    if (host.includes("huaban")) return "Huaban";
    if (host.includes("instagram")) return "Instagram";
    return host;
  }

  function bestUrl(img) {
    return img.currentSrc || img.src || img.getAttribute("data-src") || "";
  }

  function toast(text, type = "") {
    const old = document.querySelector(".museboard-toast");
    if (old) old.remove();

    const el = document.createElement("div");
    el.className = `museboard-toast ${type}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function buildPayload(img) {
    return {
      imageUrl: bestUrl(img),
      sourceUrl: location.href,
      title: img.alt || document.title || "Collected image",
      source: sourceName(),
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height
    };
  }

  function isValidImage(img) {
    const width = img?.naturalWidth || img?.width || 0;
    const height = img?.naturalHeight || img?.height || 0;
    return Boolean(img && bestUrl(img) && width >= 120 && height >= 120);
  }

  function updateBar() {
    let bar = document.querySelector(".museboard-batchbar");
    if (!active) {
      if (bar) bar.remove();
      return;
    }

    if (!bar) {
      bar = document.createElement("div");
      bar.className = "museboard-batchbar";
      bar.innerHTML = `
        <strong>Museboard</strong>
        <span class="museboard-count">Selected 0</span>
        <button class="museboard-finish" type="button">Finish Collect</button>
        <button class="museboard-cancel" type="button">Cancel</button>
      `;
      document.body.appendChild(bar);
      bar.querySelector(".museboard-finish").addEventListener("click", finish);
      bar.querySelector(".museboard-cancel").addEventListener("click", cancel);
    }

    bar.querySelector(".museboard-count").textContent = `Selected ${selected.size}`;
    bar.querySelector(".museboard-finish").disabled = selected.size === 0;
  }

  function clearHighlights() {
    document
      .querySelectorAll(".museboard-candidate,.museboard-selected")
      .forEach(el => el.classList.remove("museboard-candidate", "museboard-selected"));
  }

  function cancel() {
    active = false;
    selected.clear();
    clearHighlights();
    updateBar();
    toast("Collection cancelled");
  }

  async function postItems(items) {
    const response = await chrome.runtime.sendMessage({
      type: "MUSEBOARD_COLLECT_ITEMS",
      items
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Collect failed");
    }

    return response.data;
  }

  async function finish(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!selected.size) {
      toast("Please select images first");
      return;
    }

    const items = [...selected.values()];

    try {
      const data = await postItems(items);
      const count = data.items?.length ?? items.length;

      active = false;
      selected.clear();
      clearHighlights();
      updateBar();
      toast(`Collected ${count} images to Museboard`, "ok");
    } catch {
      toast("Collect failed. Please confirm Museboard is running.", "error");
    }
  }

  function visibleImages() {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const seen = new Set();
    const items = [];

    for (const img of Array.from(document.images)) {
      if (!isValidImage(img)) continue;

      const rect = img.getBoundingClientRect();
      const visible =
        rect.width >= 120 &&
        rect.height >= 120 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < viewportHeight &&
        rect.left < viewportWidth;

      if (!visible) continue;

      const url = bestUrl(img);
      if (seen.has(url)) continue;

      seen.add(url);
      items.push(buildPayload(img));
      if (items.length >= 60) break;
    }

    return items;
  }

  async function collectVisible() {
    const items = visibleImages();
    if (!items.length) {
      toast("No visible images found. Scroll Pinterest until images load, then try again.", "error");
      return { count: 0 };
    }

    try {
      const data = await postItems(items);
      const count = data.items?.length ?? items.length;
      toast(`Collected ${count} visible images to Museboard`, "ok");
      return { count };
    } catch {
      toast("Collect failed. Please confirm Museboard is running.", "error");
      return { count: 0 };
    }
  }

  function onMove(event) {
    if (!active) return;

    const img = event.target.closest?.("img");
    if (img === hovered) return;

    if (hovered && !selected.has(bestUrl(hovered))) {
      hovered.classList.remove("museboard-candidate");
    }
    hovered = img;

    if (isValidImage(img) && !selected.has(bestUrl(img))) {
      img.classList.add("museboard-candidate");
    }
  }

  function onClick(event) {
    if (!active) return;
    if (event.target.closest?.(".museboard-batchbar")) return;

    const img = event.target.closest?.("img");
    if (!isValidImage(img)) return;

    event.preventDefault();
    event.stopPropagation();

    const url = bestUrl(img);
    if (selected.has(url)) {
      selected.delete(url);
      img.classList.remove("museboard-selected");
      img.classList.add("museboard-candidate");
    } else {
      selected.set(url, buildPayload(img));
      img.classList.remove("museboard-candidate");
      img.classList.add("museboard-selected");
    }

    updateBar();
  }

  function startBatch() {
    active = true;
    selected.clear();
    clearHighlights();
    updateBar();
    toast("Batch collect enabled. Click images, then Finish Collect.");
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (["MUSEBOARD_START", "MUSEBOARD_START_BATCH"].includes(message.type)) {
      startBatch();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "MUSEBOARD_COLLECT_VISIBLE") {
      collectVisible().then(result => sendResponse({ ok: true, ...result }));
      return true;
    }
  });

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && active) cancel();
  });
})();
