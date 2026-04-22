(() => {
  const STORAGE_KEYS = {
    enabled: "youtubeSubbarEnabled",
    visibilityMode: "youtubeSubbarVisibilityMode",
    pinnedIds: "youtubeSubbarPinnedChannelIds",
    compactMode: "youtubeSubbarCompactMode",
    avatarCache: "youtubeSubbarAvatarCache"
  };

  const ROOT_ID = "whyext-subbar-root";
  const MAX_SIDEBAR_EXPAND_ATTEMPTS = 8;

  type VisibilityMode = "subscriptions-only" | "site-wide";

  type Settings = {
    enabled: boolean;
    visibilityMode: VisibilityMode;
    pinnedIds: string[];
    compactMode: boolean;
  };

  type ChannelItem = {
    id: string;
    name: string;
    url: string;
    avatarUrl?: string;
  };

  let settings: Settings = {
    enabled: true,
    visibilityMode: "subscriptions-only",
    pinnedIds: [],
    compactMode: false
  };
  let discoveredChannels = new Map<string, ChannelItem>();
  let avatarCache = new Map<string, string>();
  const avatarHydrationInFlight = new Set<string>();
  let sidebarExpandAttempts = 0;
  let refreshTimer: number | undefined;
  let lastUrl = location.href;
  let lastRenderSignature = "";
  let isLoading = true;

  function normalizeUrl(url: string): string {
    if (!url) {
      return "";
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (url.startsWith("/")) {
      return `https://www.youtube.com${url}`;
    }
    return "";
  }

  function isEligiblePage(): boolean {
    if (!settings.enabled) {
      return false;
    }
    if (settings.visibilityMode === "site-wide") {
      return location.hostname === "www.youtube.com";
    }
    return location.hostname === "www.youtube.com" && location.pathname.startsWith("/feed/subscriptions");
  }

  function getRoot(): HTMLDivElement {
    let root = document.getElementById(ROOT_ID) as HTMLDivElement | null;
    if (root) {
      return root;
    }
    root = document.createElement("div");
    root.id = ROOT_ID;
    return root;
  }

  function removeRoot() {
    const root = document.getElementById(ROOT_ID);
    if (root) {
      root.remove();
    }
  }

  function resetViewState() {
    discoveredChannels = new Map<string, ChannelItem>();
    sidebarExpandAttempts = 0;
    lastRenderSignature = "";
    isLoading = true;
  }

  function decodeEscapedUrl(input: string): string {
    return input
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&");
  }

  async function persistAvatarCache() {
    const payload: Record<string, string> = {};
    avatarCache.forEach((value, key) => {
      payload[key] = value;
    });
    await chrome.storage.local.set({ [STORAGE_KEYS.avatarCache]: payload });
  }

  async function fetchAvatarFromChannelPage(channelUrl: string): Promise<string | undefined> {
    try {
      const response = await fetch(channelUrl, { credentials: "include" });
      if (!response.ok) {
        return undefined;
      }
      const html = await response.text();

      const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (ogMatch?.[1]) {
        return decodeEscapedUrl(ogMatch[1]);
      }

      const avatarMatch = html.match(/"avatar"\s*:\s*\{"thumbnails"\s*:\s*\[(.*?)\]\}/);
      if (avatarMatch?.[1]) {
        const urlMatch = avatarMatch[1].match(/"url"\s*:\s*"([^"]+)"/);
        if (urlMatch?.[1]) {
          return decodeEscapedUrl(urlMatch[1]);
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  function cleanName(raw: string): string {
    return raw.replace(/\s+/g, " ").trim();
  }

  function extractChannelIdFromHref(href: string): string {
    const path = href.replace(/^https?:\/\/www\.youtube\.com/, "").split("?")[0];
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) {
      return href;
    }
    if (parts[0].startsWith("@")) {
      return parts[0].toLowerCase();
    }
    if (parts[0] === "channel" && parts[1]) {
      return `channel:${parts[1]}`;
    }
    if ((parts[0] === "c" || parts[0] === "user") && parts[1]) {
      return `${parts[0]}:${parts[1].toLowerCase()}`;
    }
    return `${parts[0]}:${parts[1] || ""}`.toLowerCase();
  }

  function candidateSelectors(): string[] {
    return [
      "#guide-content a[href^=\"/@\"]",
      "#guide-content a[href^=\"/channel/\"]",
      "#guide-content a[href^=\"/c/\"]",
      "#guide-content a[href^=\"/user/\"]",
      "ytd-guide-section-renderer a[href^=\"/@\"]",
      "ytd-guide-section-renderer a[href^=\"/channel/\"]",
      "ytd-guide-section-renderer a[href^=\"/c/\"]",
      "ytd-guide-section-renderer a[href^=\"/user/\"]",
      "ytd-rich-grid-renderer ytd-channel-name a",
      "ytd-video-owner-renderer a[href^=\"/@\"]"
    ];
  }

  function collectChannels(): ChannelItem[] {
    const map = new Map<string, ChannelItem>();
    const rejectedNames = new Set([
      "home",
      "subscriptions",
      "trending",
      "history",
      "library",
      "shorts",
      "you",
      "youtube"
    ]);

    const avatarLookup = new Map<string, string>();

    function addAvatarFromLink(anchor: HTMLAnchorElement) {
      const href = normalizeUrl(anchor.getAttribute("href") || "");
      if (!href.includes("youtube.com/")) {
        return;
      }
      const id = extractChannelIdFromHref(href);
      const image = anchor.querySelector("img");
      const src = image?.currentSrc || image?.src;
      if (!src || !/^https?:\/\//.test(src)) {
        return;
      }
      if (!avatarLookup.has(id)) {
        avatarLookup.set(id, src);
      }
    }

    document
      .querySelectorAll<HTMLAnchorElement>(
        "a[href^='/@'], a[href^='/channel/'], a[href^='/c/'], a[href^='/user/']"
      )
      .forEach((anchor) => {
        addAvatarFromLink(anchor);
      });

    function getAvatarUrl(node: HTMLAnchorElement): string | undefined {
      const nodeHref = normalizeUrl(node.getAttribute("href") || "");
      const nodeId = nodeHref ? extractChannelIdFromHref(nodeHref) : "";
      if (nodeId && avatarLookup.has(nodeId)) {
        return avatarLookup.get(nodeId);
      }

      const imageCandidates: Array<HTMLImageElement | null> = [
        node.querySelector("img"),
        node.closest("ytd-guide-entry-renderer")?.querySelector("yt-img-shadow img") as HTMLImageElement | null,
        node.closest("ytd-guide-entry-renderer")?.querySelector("img") as HTMLImageElement | null,
        node.closest("ytd-video-owner-renderer")?.querySelector("img") as HTMLImageElement | null,
        node.closest("ytd-channel-name")?.parentElement?.querySelector("img") as HTMLImageElement | null
      ];

      for (const img of imageCandidates) {
        const src = img?.currentSrc || img?.src;
        if (!src) {
          continue;
        }
        if (!/^https?:\/\//.test(src)) {
          continue;
        }
        if (src.includes("yt3.ggpht.com") || src.includes("googleusercontent.com")) {
          if (nodeId) {
            avatarLookup.set(nodeId, src);
          }
          return src;
        }
        if (nodeId) {
          avatarLookup.set(nodeId, src);
        }
        return src;
      }
      return undefined;
    }

    candidateSelectors().forEach((selector) => {
      const nodes = document.querySelectorAll<HTMLAnchorElement>(selector);
      nodes.forEach((node) => {
        const href = normalizeUrl(node.getAttribute("href") || "");
        if (!href.includes("youtube.com/")) {
          return;
        }
        const id = extractChannelIdFromHref(href);
        const name = cleanName(node.textContent || node.getAttribute("title") || "");
        const avatarUrl = getAvatarUrl(node);
        if (!name || name.length > 70 || rejectedNames.has(name.toLowerCase())) {
          return;
        }
        if (!map.has(id)) {
          map.set(id, { id, name, url: href, avatarUrl });
          return;
        }

        const existing = map.get(id);
        if (existing && !existing.avatarUrl && avatarUrl) {
          map.set(id, { ...existing, avatarUrl });
        }
      });
    });

    map.forEach((item, id) => {
      const existing = discoveredChannels.get(id);
      if (!existing) {
        const cachedAvatar = avatarCache.get(id);
        discoveredChannels.set(id, cachedAvatar ? { ...item, avatarUrl: cachedAvatar } : item);
        return;
      }
        if (!existing.avatarUrl && item.avatarUrl) {
          discoveredChannels.set(id, { ...existing, avatarUrl: item.avatarUrl });
        avatarCache.set(id, item.avatarUrl);
        }
    });

    if (discoveredChannels.size > 0) {
      isLoading = false;
    }

    return Array.from(discoveredChannels.values());
  }

  function maybeExpandSidebarSubscriptions() {
    if (sidebarExpandAttempts >= MAX_SIDEBAR_EXPAND_ATTEMPTS) {
      return;
    }

    const guide = document.querySelector<HTMLElement>("#guide-content, ytd-guide-renderer");
    if (!guide) {
      return;
    }

    const labels = ["show more", "more", "daha fazla", "daha fazlasını göster", "daha fazla göster"];
    const elements = guide.querySelectorAll<HTMLElement>("button, tp-yt-paper-item, ytd-guide-entry-renderer");

    for (const element of elements) {
      const text = (element.textContent || "").toLowerCase().replace(/\s+/g, " ").trim();
      if (!text) {
        continue;
      }
      const isCandidate = labels.some((label) => text.includes(label));
      const looksLikeCollapse = text.includes("show less") || text.includes("daha az");
      if (!isCandidate || looksLikeCollapse) {
        continue;
      }

      sidebarExpandAttempts += 1;
      element.click();
      scheduleRender();
      return;
    }
  }

  function getSortedChannels(channels: ChannelItem[]): ChannelItem[] {
    const pinned = new Set(settings.pinnedIds);
    return channels.sort((a, b) => {
      const pinDelta = Number(pinned.has(b.id)) - Number(pinned.has(a.id));
      if (pinDelta !== 0) {
        return pinDelta;
      }
      return a.name.localeCompare(b.name);
    });
  }

  function hydrateMissingAvatars(channels: ChannelItem[]) {
    const candidates = channels
      .filter((item) => !item.avatarUrl)
      .filter((item) => !avatarHydrationInFlight.has(item.id))
      .slice(0, 8);

    candidates.forEach((item) => {
      avatarHydrationInFlight.add(item.id);
      void fetchAvatarFromChannelPage(item.url)
        .then((avatarUrl) => {
          if (!avatarUrl) {
            return;
          }
          const existing = discoveredChannels.get(item.id);
          if (!existing) {
            return;
          }
          discoveredChannels.set(item.id, { ...existing, avatarUrl });
          avatarCache.set(item.id, avatarUrl);
          void persistAvatarCache();
          scheduleRender();
        })
        .finally(() => {
          avatarHydrationInFlight.delete(item.id);
        });
    });
  }

  function getMountPoint():
    | {
        parent: HTMLElement;
        beforeNode: Element | null;
      }
    | null {
    const richGrid = document.querySelector<HTMLElement>(
      "ytd-browse[page-subtype='subscriptions'] ytd-rich-grid-renderer"
    );
    if (richGrid?.parentElement) {
      return { parent: richGrid.parentElement as HTMLElement, beforeNode: richGrid };
    }

    const sectionList = document.querySelector<HTMLElement>(
      "ytd-browse[page-subtype='subscriptions'] ytd-section-list-renderer"
    );
    if (sectionList?.parentElement) {
      return { parent: sectionList.parentElement as HTMLElement, beforeNode: sectionList };
    }

    const primary = document.querySelector<HTMLElement>("ytd-browse #primary");
    if (primary) {
      return { parent: primary, beforeNode: primary.firstElementChild };
    }

    const watchPrimary = document.querySelector<HTMLElement>("ytd-watch-flexy #primary");
    if (watchPrimary) {
      return { parent: watchPrimary, beforeNode: watchPrimary.firstElementChild };
    }

    const searchPrimary = document.querySelector<HTMLElement>("ytd-two-column-search-results-renderer #primary");
    if (searchPrimary) {
      return { parent: searchPrimary, beforeNode: searchPrimary.firstElementChild };
    }

    const genericPrimary = document.querySelector<HTMLElement>("ytd-page-manager #primary");
    if (genericPrimary) {
      return { parent: genericPrimary, beforeNode: genericPrimary.firstElementChild };
    }

    const mainContent = document.querySelector<HTMLElement>("ytd-app #content");
    if (mainContent) {
      return { parent: mainContent, beforeNode: mainContent.firstElementChild };
    }

    const app = document.querySelector<HTMLElement>("ytd-app");
    if (app) {
      return { parent: app, beforeNode: app.firstElementChild };
    }

    return null;
  }

  function setPinButtonState(button: HTMLButtonElement, pinned: boolean, chip?: HTMLDivElement) {
    button.textContent = pinned ? "★" : "☆";
    button.dataset.pinned = String(pinned);
    button.title = pinned ? "Unpin channel" : "Pin channel";
    button.setAttribute("aria-label", pinned ? "Remove from favorites" : "Add to favorites");
    if (chip) {
      chip.dataset.pinned = String(pinned);
    }
  }

  function togglePin(id: string, button?: HTMLButtonElement) {
    const current = new Set(settings.pinnedIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    const pinned = current.has(id);
    settings.pinnedIds = Array.from(current);

    if (button) {
      const chip = button.closest(".whyext-subbar-chip") as HTMLDivElement | null;
      setPinButtonState(button, pinned, chip || undefined);
    }

    // Persist in background and refresh row ordering asynchronously.
    void chrome.storage.local.set({ [STORAGE_KEYS.pinnedIds]: settings.pinnedIds });
    scheduleRender();
  }

  function buildChipRow(channels: ChannelItem[]): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "whyext-subbar-chip-row";

    channels.forEach((item) => {
      const chip = document.createElement("div");
      chip.className = "whyext-subbar-chip";

      const anchor = document.createElement("a");
      anchor.href = item.url;
      anchor.title = item.name;
      anchor.className = "whyext-subbar-chip-link";

      if (item.avatarUrl) {
        const avatar = document.createElement("img");
        avatar.className = "whyext-subbar-avatar";
        avatar.src = item.avatarUrl;
        avatar.alt = `${item.name} avatar`;
        avatar.referrerPolicy = "no-referrer";
        anchor.appendChild(avatar);
      } else {
        const fallback = document.createElement("span");
        fallback.className = "whyext-subbar-avatar-fallback";
        fallback.textContent = item.name.charAt(0).toUpperCase();
        anchor.appendChild(fallback);
      }

      const pinBtn = document.createElement("button");
      pinBtn.className = "whyext-subbar-pin-btn";
      const pinned = settings.pinnedIds.includes(item.id);
      setPinButtonState(pinBtn, pinned, chip);
      pinBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePin(item.id, pinBtn);
      });

      chip.append(anchor, pinBtn);
      row.appendChild(chip);
    });

    return row;
  }

  function buildPanel(channels: ChannelItem[]): HTMLDivElement {
    const panel = document.createElement("div");
    panel.className = "whyext-subbar-panel";
    if (settings.compactMode) {
      panel.classList.add("compact");
    }

    if (channels.length === 0 && isLoading) {
      const skeletonWrap = document.createElement("div");
      skeletonWrap.className = "whyext-subbar-skeleton-row";
      for (let index = 0; index < 10; index += 1) {
        const item = document.createElement("div");
        item.className = "whyext-subbar-skeleton-chip";
        skeletonWrap.appendChild(item);
      }
      panel.appendChild(skeletonWrap);
    } else if (channels.length === 0) {
      const empty = document.createElement("div");
      empty.className = "whyext-subbar-empty";
      empty.textContent = "Subscriptions data not found yet. Scroll a bit or refresh this page.";
      panel.appendChild(empty);
    } else {
      panel.appendChild(buildChipRow(channels));
    }

    return panel;
  }

  function render() {
    if (!document.body) {
      return;
    }
    if (!isEligiblePage()) {
      removeRoot();
      resetViewState();
      return;
    }

    maybeExpandSidebarSubscriptions();
    const channels = collectChannels();
    const sortedChannels = getSortedChannels(channels);
    hydrateMissingAvatars(sortedChannels);
    const root = getRoot();
    const mount = getMountPoint();
    if (!mount) {
      // During YouTube lazy layout swaps, mount target can be briefly missing.
      // Keep current panel to avoid visible flicker and retry soon.
      scheduleRender();
      return;
    }
    if (root.parentElement !== mount.parent || root.nextElementSibling !== mount.beforeNode) {
      mount.parent.insertBefore(root, mount.beforeNode);
    }
    const signature = `${location.pathname}|${settings.visibilityMode}|${settings.compactMode}|${settings.pinnedIds.join(",")}|${sortedChannels
      .map((item) => `${item.id}:${item.avatarUrl ? "1" : "0"}`)
      .join(",")}`;
    if (signature === lastRenderSignature) {
      return;
    }
    lastRenderSignature = signature;
    root.innerHTML = "";
    root.appendChild(buildPanel(sortedChannels));
  }

  function scheduleRender() {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
    }
    refreshTimer = window.setTimeout(() => {
      render();
    }, 260);
  }

  async function loadSettings() {
    const current = await chrome.storage.local.get([
      STORAGE_KEYS.enabled,
      STORAGE_KEYS.visibilityMode,
      STORAGE_KEYS.pinnedIds,
      STORAGE_KEYS.compactMode,
      STORAGE_KEYS.avatarCache
    ]);
    const rawEnabled = current[STORAGE_KEYS.enabled];
    const rawVisibility = current[STORAGE_KEYS.visibilityMode];
    const rawPinned = current[STORAGE_KEYS.pinnedIds];
    const rawCompact = current[STORAGE_KEYS.compactMode];
    const rawAvatarCache = current[STORAGE_KEYS.avatarCache];

    settings.enabled = typeof rawEnabled === "boolean" ? rawEnabled : true;
    settings.visibilityMode =
      rawVisibility === "site-wide" ? "site-wide" : "subscriptions-only";
    settings.pinnedIds = Array.isArray(rawPinned) ? (rawPinned as string[]) : [];
    settings.compactMode = Boolean(rawCompact);
    avatarCache = new Map<string, string>();
    if (rawAvatarCache && typeof rawAvatarCache === "object") {
      Object.entries(rawAvatarCache as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === "string" && /^https?:\/\//.test(value)) {
          avatarCache.set(key, value);
        }
      });
    }
  }

  function setupRouteListeners() {
    const notifyRouteChange = () => window.dispatchEvent(new Event("whyext-subbar:route-change"));

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      notifyRouteChange();
      return result;
    };
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      notifyRouteChange();
      return result;
    };

    window.addEventListener("popstate", notifyRouteChange);
    window.addEventListener("yt-navigate-finish", notifyRouteChange as EventListener);
    window.addEventListener("whyext-subbar:route-change", () => {
      if (lastUrl !== location.href) {
        lastUrl = location.href;
        resetViewState();
        scheduleRender();
      }
    });
  }

  function setupMutationObserver() {
    function isRelevantNode(node: Node | null): boolean {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }
      const el = node as Element;
      return Boolean(
        el.closest(
          "ytd-browse, ytd-rich-grid-renderer, ytd-guide-renderer, ytd-guide-section-renderer, #guide-content, ytd-page-manager"
        )
      );
    }

    const observer = new MutationObserver((mutations) => {
      let relevant = false;
      for (const mutation of mutations) {
        if (isRelevantNode(mutation.target)) {
          relevant = true;
          break;
        }
        for (const node of mutation.addedNodes) {
          if (isRelevantNode(node)) {
            relevant = true;
            break;
          }
        }
        if (relevant) {
          break;
        }
      }
      if (relevant) {
        scheduleRender();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "href"]
    });
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      if (
        changes[STORAGE_KEYS.enabled] ||
        changes[STORAGE_KEYS.visibilityMode] ||
        changes[STORAGE_KEYS.pinnedIds] ||
        changes[STORAGE_KEYS.compactMode]
      ) {
        void loadSettings().then(() => {
          scheduleRender();
        });
      }
    });
  }

  async function init() {
    await loadSettings();
    setupRouteListeners();
    setupMutationObserver();
    setupStorageListener();
    window.addEventListener("resize", scheduleRender);
    render();
  }

  void init();
})();
