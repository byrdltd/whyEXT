(() => {
  const STORAGE_KEYS = {
    enabled: "imageQuickSaveEnabled"
  };
  const BUTTON_ID = "whyext-image-quick-save-button";

  let isEnabled = true;
  let activeImage: HTMLImageElement | null = null;
  let hideTimer: number | undefined;

  function getRuntimeApi() {
    const maybeChrome = (globalThis as { chrome?: typeof chrome }).chrome;
    if (maybeChrome?.runtime?.sendMessage) {
      return maybeChrome.runtime;
    }

    const maybeBrowser = globalThis as unknown as {
      browser?: {
        runtime?: {
          sendMessage?: (message: unknown) => Promise<unknown>;
        };
      };
    };
    if (maybeBrowser.browser?.runtime?.sendMessage) {
      return maybeBrowser.browser.runtime;
    }
    return undefined;
  }

  function isInsideSubbar(target: HTMLElement | null) {
    if (!target) {
      return false;
    }
    return Boolean(
      target.closest(
        "#whyext-subbar-root, .whyext-subbar-panel, .whyext-subbar-chip-row, .whyext-subbar-chip, .whyext-subbar-pin-btn"
      )
    );
  }

  function ensureButton() {
    let button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
    if (button) {
      return button;
    }

    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "⬇";
    button.title = "Save image";
    button.style.position = "fixed";
    button.style.zIndex = "2147483647";
    button.style.width = "26px";
    button.style.height = "26px";
    button.style.border = "1px solid rgba(255,255,255,0.4)";
    button.style.borderRadius = "8px";
    button.style.background = "rgba(17,17,17,0.9)";
    button.style.color = "#fff";
    button.style.fontSize = "14px";
    button.style.lineHeight = "1";
    button.style.cursor = "pointer";
    button.style.display = "none";
    button.style.padding = "0";
    button.style.backdropFilter = "blur(2px)";

    button.addEventListener("mouseenter", () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
    });

    button.addEventListener("mouseleave", () => {
      scheduleHide();
    });

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!activeImage) {
        return;
      }

      const imageUrl = activeImage.currentSrc || activeImage.src;
      if (!imageUrl) {
        return;
      }

      const fromAlt = activeImage.alt?.trim() || "";
      const fromFileName = imageUrl.split("/").pop()?.split("?")[0] || "image";
      const fileName = (fromAlt || fromFileName).replace(/\s+/g, "-").slice(0, 80);

      try {
        const runtime = getRuntimeApi();
        if (!runtime) {
          console.warn("Image quick save runtime API unavailable.");
          return;
        }
        await runtime.sendMessage({
          type: "imageQuickSave:download",
          imageUrl,
          fileName
        });
      } catch (error) {
        console.error("Image quick save failed:", error);
      }
    });

    document.documentElement.appendChild(button);
    return button;
  }

  function hideButton() {
    const button = ensureButton();
    button.style.display = "none";
    activeImage = null;
  }

  function scheduleHide() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }
    hideTimer = window.setTimeout(() => {
      hideButton();
    }, 120);
  }

  function positionButtonFor(image: HTMLImageElement) {
    const button = ensureButton();
    const rect = image.getBoundingClientRect();
    const size = 26;
    const padding = 6;

    if (rect.width < 40 || rect.height < 40) {
      hideButton();
      return;
    }

    const top = Math.max(6, Math.min(window.innerHeight - size - 6, rect.top + padding));
    const left = Math.max(6, Math.min(window.innerWidth - size - 6, rect.right - size - padding));

    button.style.top = `${Math.round(top)}px`;
    button.style.left = `${Math.round(left)}px`;
    button.style.display = "block";
  }

  function handlePointerOver(event: Event) {
    if (!isEnabled) {
      hideButton();
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (isInsideSubbar(target)) {
      hideButton();
      return;
    }

    const image = target.closest("img") as HTMLImageElement | null;
    if (!image || !image.currentSrc && !image.src) {
      scheduleHide();
      return;
    }

    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }

    activeImage = image;
    positionButtonFor(image);
  }

  function handlePointerMove(event?: Event) {
    if (event) {
      const target = event.target as HTMLElement | null;
      if (isInsideSubbar(target)) {
        hideButton();
        return;
      }
    }

    if (!activeImage) {
      return;
    }
    positionButtonFor(activeImage);
  }

  async function loadEnabledState() {
    const current = await chrome.storage.local.get(STORAGE_KEYS.enabled);
    const rawEnabled = current[STORAGE_KEYS.enabled];
    isEnabled = typeof rawEnabled === "boolean" ? rawEnabled : true;
    if (!isEnabled) {
      hideButton();
    }
  }

  function init() {
    void loadEnabledState();
    ensureButton();

    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener(
      "pointerout",
      (event) => {
        const toElement = (event as PointerEvent).relatedTarget as HTMLElement | null;
        const button = ensureButton();
        if (
          toElement &&
          !isInsideSubbar(toElement) &&
          (button.contains(toElement) || toElement.closest("img"))
        ) {
          return;
        }
        scheduleHide();
      },
      true
    );

    window.addEventListener("scroll", handlePointerMove, true);
    window.addEventListener("resize", handlePointerMove);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_KEYS.enabled]) {
        return;
      }
      isEnabled = Boolean(changes[STORAGE_KEYS.enabled].newValue);
      if (!isEnabled) {
        hideButton();
      }
    });
  }

  init();
})();
