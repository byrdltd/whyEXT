(() => {
  const STORAGE_KEY = "darkModeDomains";

  function normalizeDomain(input: string): string {
    return input.trim().toLowerCase().replace(/^www\./, "");
  }

  async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function getActiveDomain() {
    const tab = await getActiveTab();
    try {
      return tab?.url ? normalizeDomain(new URL(tab.url).hostname) : "";
    } catch {
      return "";
    }
  }

  async function getEnabledDomains(): Promise<string[]> {
    const raw = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(raw[STORAGE_KEY]) ? (raw[STORAGE_KEY] as string[]) : [];
  }

  async function saveEnabledDomains(domains: string[]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: Array.from(new Set(domains)) });
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

  async function renderState(domain: string) {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    const toggleBtn = document.getElementById("toggle-dark-mode") as HTMLButtonElement;

    if (!domain) {
      statusEl.textContent = "Unsupported tab URL.";
      toggleBtn.disabled = true;
      return;
    }

    const enabledDomains = await getEnabledDomains();
    const isEnabled = enabledDomains.includes(domain);
    statusEl.textContent = `Dark mode is ${isEnabled ? "enabled" : "disabled"} for this domain.`;
    toggleBtn.textContent = isEnabled ? "Disable dark mode" : "Enable dark mode";
  }

  async function toggleCurrentDomain() {
    const domain = (document.getElementById("domain") as HTMLParagraphElement).textContent || "";
    const tab = await getActiveTab();
    const statusEl = document.getElementById("status") as HTMLParagraphElement;

    if (!domain || !tab?.id) {
      statusEl.textContent = "No active tab/domain.";
      return;
    }

    const enabledDomains = await getEnabledDomains();
    const isEnabled = enabledDomains.includes(domain);
    const nextEnabled = !isEnabled;

    const nextDomains = nextEnabled
      ? [...enabledDomains, domain]
      : enabledDomains.filter((item) => item !== domain);

    await saveEnabledDomains(nextDomains);
    await applyDarkMode(tab.id, nextEnabled);
    await renderState(domain);
  }

  async function initPopup() {
    const domainEl = document.getElementById("domain") as HTMLParagraphElement;
    const openOptionsBtn = document.getElementById("open-options") as HTMLButtonElement;
    const activeTab = await getActiveTab();

    const domain = await getActiveDomain();
    domainEl.textContent = domain || "No active tab URL";

    document.getElementById("toggle-dark-mode")?.addEventListener("click", () => {
      void toggleCurrentDomain();
    });
    openOptionsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    await renderState(domain);

    if (domain && activeTab?.id) {
      const enabledDomains = await getEnabledDomains();
      if (enabledDomains.includes(domain)) {
        await applyDarkMode(activeTab.id, true);
      }
    }
  }

  initPopup().catch((error) => {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    statusEl.textContent = `Error: ${(error as Error).message}`;
  });
})();
