const els = {
  searchInput: document.getElementById("searchInput"),
  matchHandwritten: document.getElementById("matchHandwritten"),
  matchTyped: document.getElementById("matchTyped"),
  itemsGrid: document.getElementById("itemsGrid"),
  template: document.getElementById("itemTemplate"),
  resultsCount: document.getElementById("resultsCount"),
  errorBox: document.getElementById("errorBox"),
  emptyBox: document.getElementById("emptyBox"),
};

/** @type {Array<{id:string,handwrittenText?:string,typedProductCode?:string,handwritingImage?:string,typedImage?:string}>} */
let items = [];

const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  if (themeToggle) themeToggle.checked = theme === "dark";
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // ignore storage errors
  }
}

function getInitialTheme() {
  const saved = (() => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  })();

  if (saved === "dark" || saved === "light") return saved;
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

(function initTheme() {
  const theme = getInitialTheme();
  applyTheme(theme);
  if (!themeToggle) return;
  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
  });
})();

function normalizeForSearch(s) {
  // Keep letters/numbers, turn everything else into spaces.
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toTokens(query) {
  const n = normalizeForSearch(query);
  if (!n) return [];
  return n.split(" ").filter(Boolean);
}

function itemMatches(item, query) {
  const tokens = toTokens(query);
  if (tokens.length === 0) return true;

  const matchHandwritten = els.matchHandwritten.checked;
  const matchTyped = els.matchTyped.checked;
  if (!matchHandwritten && !matchTyped) return false;

  const hand = normalizeForSearch(item.handwrittenText);
  const typed = normalizeForSearch(item.typedProductCode);

  const matchesField = (fieldText) => tokens.every((t) => fieldText.includes(t));

  let ok = false;
  if (matchHandwritten) ok = ok || matchesField(hand);
  if (matchTyped) ok = ok || matchesField(typed);
  return ok;
}

function render(itemsToRender) {
  els.itemsGrid.innerHTML = "";

  els.resultsCount.textContent = `${itemsToRender.length} result${itemsToRender.length === 1 ? "" : "s"}`;

  if (itemsToRender.length === 0) {
    els.emptyBox.hidden = false;
    return;
  }
  els.emptyBox.hidden = true;

  for (const item of itemsToRender) {
    const node = els.template.content.firstElementChild.cloneNode(true);

    const handTextEl = node.querySelector(".handText");
    const typedCodeEl = node.querySelector(".typedCode");
    const handImgEl = node.querySelector(".pair__img--hand");
    const typedImgEl = node.querySelector(".pair__img--typed");
    const zoomHandRangeEl = node.querySelector(".zoomRow__range--hand");
    const zoomTypedRangeEl = node.querySelector(".zoomRow__range--typed");
    const zoomHandPercentEl = node.querySelector(".zoomRow__percent--hand");
    const zoomTypedPercentEl = node.querySelector(".zoomRow__percent--typed");
    const imgEls = node.querySelectorAll(".pair__img");
    const viewerEls = node.querySelectorAll(".pair__viewer");

    /** @type {Array<{viewerEl:HTMLElement,imgEl:HTMLImageElement,type:"hand"|"typed",scale:number,panX:number,panY:number,dragging:boolean,startX:number,startY:number,startPanX:number,startPanY:number,pointerId:number|null}>} */
    const panStates = [];

    function applyTransform(state) {
      // panX/panY are in "unscaled pixels", then we scale to keep drag 1:1 with the cursor movement.
      state.imgEl.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
    }

    for (const viewerEl of viewerEls) {
      const imgEl = viewerEl.querySelector(".pair__img");
      if (!imgEl) continue;
      panStates.push({
        viewerEl,
        imgEl,
        type: viewerEl.classList.contains("pair__viewer--hand") ? "hand" : "typed",
        scale: 1,
        panX: 0,
        panY: 0,
        dragging: false,
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
        pointerId: null,
      });

      viewerEl.style.touchAction = "none"; // important for touch dragging

      viewerEl.addEventListener("pointerdown", (e) => {
        // Only pan when zoomed in (scale > 1).
        const state = panStates.find((s) => s.viewerEl === viewerEl);
        if (!state || state.scale <= 1.01) return;

        e.preventDefault();
        viewerEl.dataset.dragging = "true";
        viewerEl.setPointerCapture(e.pointerId);
        state.dragging = true;
        state.pointerId = e.pointerId;
        state.startX = e.clientX;
        state.startY = e.clientY;
        state.startPanX = state.panX;
        state.startPanY = state.panY;
      });

      viewerEl.addEventListener("pointermove", (e) => {
        const state = panStates.find((s) => s.viewerEl === viewerEl);
        if (!state || !state.dragging) return;

        e.preventDefault();
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;

        // Convert cursor movement into "unscaled pixels" so it feels 1:1.
        state.panX = state.startPanX + dx / state.scale;
        state.panY = state.startPanY + dy / state.scale;
        applyTransform(state);
      });

      const stopDrag = (e) => {
        const state = panStates.find((s) => s.viewerEl === viewerEl);
        if (!state) return;
        state.dragging = false;
        state.pointerId = null;
        viewerEl.dataset.dragging = "false";
        try {
          viewerEl.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      };

      viewerEl.addEventListener("pointerup", stopDrag);
      viewerEl.addEventListener("pointercancel", stopDrag);
      viewerEl.addEventListener("pointerleave", () => {
        // If pointer leaves while dragging, end the drag so it doesn't get stuck.
        const state = panStates.find((s) => s.viewerEl === viewerEl);
        if (!state || !state.dragging) return;
        state.dragging = false;
        state.pointerId = null;
        viewerEl.dataset.dragging = "false";
      });
    }

    handTextEl.textContent = item.handwrittenText ?? "(empty)";
    typedCodeEl.textContent = item.typedProductCode ?? "(empty)";

    handImgEl.src = item.handwritingImage ?? "";
    typedImgEl.src = item.typedImage ?? "";

    // If images are missing, show an empty alt box instead of broken visuals.
    handImgEl.addEventListener(
      "error",
      () => {
        handImgEl.removeAttribute("src");
        handImgEl.style.opacity = "0.35";
      },
      { once: true },
    );
    typedImgEl.addEventListener(
      "error",
      () => {
        typedImgEl.removeAttribute("src");
        typedImgEl.style.opacity = "0.35";
      },
      { once: true },
    );

    function setZoom(handPercent, typedPercent) {
      const handP = Math.max(80, Math.min(300, Number(handPercent)));
      const typedP = Math.max(80, Math.min(300, Number(typedPercent)));
      const handScale = handP / 100;
      const typedScale = typedP / 100;

      panStates.forEach((state) => {
        const scale = state.type === "hand" ? handScale : typedScale;
        state.scale = scale;
        // Reset pan when zoom changes so you don't get lost.
        state.panX = 0;
        state.panY = 0;
        applyTransform(state);
        state.viewerEl.dataset.zoomed = scale > 1.01 ? "true" : "false";
      });

      if (zoomHandPercentEl) zoomHandPercentEl.textContent = `${handP}%`;
      if (zoomTypedPercentEl) zoomTypedPercentEl.textContent = `${typedP}%`;
    }

    setZoom(zoomHandRangeEl?.value ?? "170", zoomTypedRangeEl?.value ?? "170");

    if (zoomHandRangeEl) {
      zoomHandRangeEl.addEventListener("input", () =>
        setZoom(zoomHandRangeEl.value, zoomTypedRangeEl?.value ?? "170"),
      );
    }
    if (zoomTypedRangeEl) {
      zoomTypedRangeEl.addEventListener("input", () =>
        setZoom(zoomHandRangeEl?.value ?? "170", zoomTypedRangeEl.value),
      );
    }

    els.itemsGrid.appendChild(node);
  }
}

async function loadItems() {
  // Uses a local server (fetch doesn't work properly from file:// in many browsers).
  const res = await fetch("./items.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load items.json (HTTP ${res.status})`);
  const data = await res.json();

  if (!Array.isArray(data)) {
    // Allow wrapping: { items: [...] }
    if (Array.isArray(data.items)) return data.items;
    throw new Error("items.json must be an array of item objects (or { items: [...] }).");
  }
  return data;
}

function getCurrentQuery() {
  return els.searchInput.value ?? "";
}

function applyFiltersAndRender() {
  const query = getCurrentQuery();
  const filtered = items.filter((it) => itemMatches(it, query));
  render(filtered);
}

function showError(message) {
  els.errorBox.hidden = false;
  els.errorBox.textContent = message;
}

function initEvents() {
  els.searchInput.addEventListener("input", applyFiltersAndRender);
  els.matchHandwritten.addEventListener("change", applyFiltersAndRender);
  els.matchTyped.addEventListener("change", applyFiltersAndRender);
}

(async function main() {
  initEvents();

  try {
    items = await loadItems();
    render(items);
  } catch (err) {
    showError(
      `Could not load items.json. Start a simple local server (so fetch works) and ensure items.json exists. Details: ${err?.message ?? String(err)}`,
    );
  }
})();

