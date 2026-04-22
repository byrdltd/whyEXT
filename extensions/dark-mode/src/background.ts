(() => {
  const STORAGE_KEY = "darkModeDomains";

  function normalizeDomain(input: string): string {
    return input.trim().toLowerCase().replace(/^www\./, "");
  }

  function getDomainFromUrl(url?: string): string {
    if (!url) {
      return "";
    }
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) {
        return "";
      }
      return normalizeDomain(parsed.hostname);
    } catch {
      return "";
    }
  }

  function isScriptableUrl(url?: string): boolean {
    if (!url) {
      return false;
    }
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) {
        return false;
      }
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();

      // Browser stores and internal gallery pages cannot be scripted.
      if ((host === "chrome.google.com" && path.startsWith("/webstore")) || host === "chromewebstore.google.com") {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async function getEnabledDomains(): Promise<string[]> {
    const current = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(current[STORAGE_KEY]) ? (current[STORAGE_KEY] as string[]) : [];
  }

  async function ensureStorageDefaults() {
    const current = await chrome.storage.local.get(STORAGE_KEY);
    if (!Array.isArray(current[STORAGE_KEY])) {
      await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    }
  }

  async function applyDarkMode(tabId: number, enabled: boolean) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (isEnabled) => {
        const STYLE_ID = "whyext-dark-mode-style";
        const BG_IMAGE_CLASS = "whyext-bg-image";
        const BG_IMAGE_BEFORE_CLASS = "whyext-bg-before-image";
        const BG_IMAGE_AFTER_CLASS = "whyext-bg-after-image";
        const OBSERVER_KEY = "__whyextDarkModeObserver";
        const MQ_CLEANUP_KEY = "__whyextDarkModeMqCleanup";
        const SCAN_TIMER_KEY = "__whyextDarkModeScanTimer";
        const globalState = window as unknown as Record<string, unknown>;

        function removeStyle() {
          const style = document.getElementById(STYLE_ID);
          if (style) {
            style.remove();
          }
        }

        function ensureStyle() {
          if (document.getElementById(STYLE_ID)) {
            return;
          }
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = `
            html { filter: invert(1) hue-rotate(180deg) !important; background: #111 !important; }
            img, video, iframe, svg, picture, canvas, object, embed,
            [style*="background-image"], [style*="background: url"], [style*="background:url"],
            .${BG_IMAGE_CLASS},
            .${BG_IMAGE_CLASS}::before,
            .${BG_IMAGE_CLASS}::after,
            .${BG_IMAGE_BEFORE_CLASS}::before,
            .${BG_IMAGE_AFTER_CLASS}::after {
              filter: invert(1) hue-rotate(180deg) !important;
            }
          `;
          document.documentElement.appendChild(style);
        }

        function markBackgroundImageElements() {
          const allElements = document.querySelectorAll("*");
          allElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            const backgroundImage = getComputedStyle(htmlElement).backgroundImage;
            if (backgroundImage && backgroundImage !== "none") {
              htmlElement.classList.add(BG_IMAGE_CLASS);
            }

            const beforeBackground = getComputedStyle(htmlElement, "::before").backgroundImage;
            if (beforeBackground && beforeBackground !== "none") {
              htmlElement.classList.add(BG_IMAGE_BEFORE_CLASS);
            }

            const afterBackground = getComputedStyle(htmlElement, "::after").backgroundImage;
            if (afterBackground && afterBackground !== "none") {
              htmlElement.classList.add(BG_IMAGE_AFTER_CLASS);
            }
          });
        }

        function scheduleBackgroundScan() {
          const timerId = globalState[SCAN_TIMER_KEY] as number | undefined;
          if (timerId) {
            window.clearTimeout(timerId);
          }
          globalState[SCAN_TIMER_KEY] = window.setTimeout(() => {
            markBackgroundImageElements();
          }, 150);
        }

        function isPageUsingDarkTheme() {
          const html = document.documentElement;
          const body = document.body;
          const htmlStyle = getComputedStyle(html);
          const bodyStyle = body ? getComputedStyle(body) : null;
          const htmlAttr = `${html.className} ${html.getAttribute("data-theme") || ""}`.toLowerCase();
          const bodyAttr = body
            ? `${body.className} ${body.getAttribute("data-theme") || ""}`.toLowerCase()
            : "";

          const htmlScheme = htmlStyle.colorScheme || "";
          const bodyScheme = bodyStyle?.colorScheme || "";
          if (htmlScheme.includes("dark") || bodyScheme.includes("dark")) {
            return true;
          }
          return /(^|\s)(dark|darkmode|night|nightmode)(\s|$)/.test(htmlAttr + " " + bodyAttr);
        }

        function syncAdaptiveMode() {
          if (isPageUsingDarkTheme()) {
            removeStyle();
          } else {
            ensureStyle();
            scheduleBackgroundScan();
          }
        }

        const previousObserver = globalState[OBSERVER_KEY] as MutationObserver | undefined;
        if (previousObserver) {
          previousObserver.disconnect();
          delete globalState[OBSERVER_KEY];
        }

        const previousMqCleanup = globalState[MQ_CLEANUP_KEY] as (() => void) | undefined;
        if (previousMqCleanup) {
          previousMqCleanup();
          delete globalState[MQ_CLEANUP_KEY];
        }

        if (!isEnabled) {
          removeStyle();
          const timerId = globalState[SCAN_TIMER_KEY] as number | undefined;
          if (timerId) {
            window.clearTimeout(timerId);
            delete globalState[SCAN_TIMER_KEY];
          }
          return;
        }

        syncAdaptiveMode();

        const observer = new MutationObserver(() => {
          syncAdaptiveMode();
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "style", "data-theme"],
          childList: true,
          subtree: true
        });
        globalState[OBSERVER_KEY] = observer;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const mediaListener = () => syncAdaptiveMode();
        mediaQuery.addEventListener("change", mediaListener);
        globalState[MQ_CLEANUP_KEY] = () => {
          mediaQuery.removeEventListener("change", mediaListener);
        };
      },
      args: [enabled]
    });
  }

  async function syncTab(tabId: number, rawUrl?: string) {
    if (!isScriptableUrl(rawUrl)) {
      return;
    }

    const domain = getDomainFromUrl(rawUrl);
    if (!domain) {
      return;
    }
    const enabledDomains = await getEnabledDomains();
    try {
      await applyDarkMode(tabId, enabledDomains.includes(domain));
    } catch (error) {
      const message = (error as Error)?.message || "";
      if (
        message.includes("cannot be scripted") ||
        message.includes("extensions gallery") ||
        message.includes("Missing host permission")
      ) {
        return;
      }
      throw error;
    }
  }

  async function syncAllTabs() {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) {
        continue;
      }
      await syncTab(tab.id, tab.url);
    }
  }

  chrome.runtime.onInstalled.addListener(() => {
    Promise.all([ensureStorageDefaults(), syncAllTabs()]).catch((error) => {
      console.error("Failed to initialize dark-mode storage:", error);
    });
  });

  chrome.runtime.onStartup.addListener(() => {
    syncAllTabs().catch((error) => {
      console.error("Failed to sync dark-mode on startup:", error);
    });
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" && !changeInfo.url) {
      return;
    }
    void syncTab(tabId, changeInfo.url ?? tab.url).catch((error) => {
      console.error("Failed to sync dark-mode on tab update:", error);
    });
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        return;
      }
      void syncTab(tabId, tab.url).catch((error) => {
        console.error("Failed to sync dark-mode on tab activate:", error);
      });
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }
    void syncAllTabs().catch((error) => {
      console.error("Failed to sync dark-mode after storage change:", error);
    });
  });
})();
