(() => {
  const STORAGE_KEYS = {
    enabled: "youtubeSubbarEnabled",
    visibilityMode: "youtubeSubbarVisibilityMode",
    pinnedIds: "youtubeSubbarPinnedChannelIds",
    compactMode: "youtubeSubbarCompactMode"
  };

  type VisibilityMode = "subscriptions-only" | "site-wide";

  function setStatus(message: string) {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    statusEl.textContent = message;
  }

  async function loadSettings() {
    const current = await chrome.storage.local.get([
      STORAGE_KEYS.enabled,
      STORAGE_KEYS.visibilityMode,
      STORAGE_KEYS.pinnedIds,
      STORAGE_KEYS.compactMode
    ]);
    const rawEnabled = current[STORAGE_KEYS.enabled];
    const rawVisibility = current[STORAGE_KEYS.visibilityMode];
    const rawPinned = current[STORAGE_KEYS.pinnedIds];
    const rawCompact = current[STORAGE_KEYS.compactMode];
    return {
      enabled: typeof rawEnabled === "boolean" ? rawEnabled : true,
      visibilityMode: rawVisibility === "site-wide" ? "site-wide" : "subscriptions-only",
      compactMode: Boolean(rawCompact),
      pinnedCount: Array.isArray(rawPinned) ? rawPinned.length : 0
    } as {
      enabled: boolean;
      visibilityMode: VisibilityMode;
      compactMode: boolean;
      pinnedCount: number;
    };
  }

  async function saveSettings(next: { enabled: boolean; visibilityMode: VisibilityMode; compactMode: boolean }) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.enabled]: next.enabled,
      [STORAGE_KEYS.visibilityMode]: next.visibilityMode,
      [STORAGE_KEYS.compactMode]: next.compactMode
    });
  }

  async function render() {
    const settings = await loadSettings();
    (document.getElementById("enabled") as HTMLInputElement).checked = settings.enabled;
    (document.getElementById("visibility-mode") as HTMLSelectElement).value = settings.visibilityMode;
    (document.getElementById("compact-mode") as HTMLInputElement).checked = settings.compactMode;
    setStatus(`Settings loaded. Pinned channels: ${settings.pinnedCount}`);
  }

  async function init() {
    const enabledEl = document.getElementById("enabled") as HTMLInputElement;
    const visibilityEl = document.getElementById("visibility-mode") as HTMLSelectElement;
    const compactEl = document.getElementById("compact-mode") as HTMLInputElement;
    const clearPinsBtn = document.getElementById("clear-pins") as HTMLButtonElement;

    const onChange = async () => {
      await saveSettings({
        enabled: enabledEl.checked,
        visibilityMode: visibilityEl.value === "site-wide" ? "site-wide" : "subscriptions-only",
        compactMode: compactEl.checked
      });
      setStatus("Saved.");
    };

    enabledEl.addEventListener("change", () => {
      void onChange();
    });
    visibilityEl.addEventListener("change", () => {
      void onChange();
    });
    compactEl.addEventListener("change", () => {
      void onChange();
    });
    clearPinsBtn.addEventListener("click", async () => {
      await chrome.storage.local.set({ [STORAGE_KEYS.pinnedIds]: [] });
      await render();
      setStatus("Pinned channels cleared.");
    });

    await render();
  }

  void init();
})();
