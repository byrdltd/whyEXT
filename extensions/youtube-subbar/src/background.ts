(() => {
  const STORAGE_KEYS = {
    enabled: "youtubeSubbarEnabled",
    visibilityMode: "youtubeSubbarVisibilityMode",
    pinnedIds: "youtubeSubbarPinnedChannelIds",
    compactMode: "youtubeSubbarCompactMode"
  };

  async function ensureDefaults() {
    const current = await chrome.storage.local.get([
      STORAGE_KEYS.enabled,
      STORAGE_KEYS.visibilityMode,
      STORAGE_KEYS.pinnedIds,
      STORAGE_KEYS.compactMode
    ]);

    const next: Record<string, unknown> = {};
    if (typeof current[STORAGE_KEYS.enabled] !== "boolean") {
      next[STORAGE_KEYS.enabled] = true;
    }
    if (current[STORAGE_KEYS.visibilityMode] !== "site-wide" && current[STORAGE_KEYS.visibilityMode] !== "subscriptions-only") {
      next[STORAGE_KEYS.visibilityMode] = "subscriptions-only";
    }
    if (!Array.isArray(current[STORAGE_KEYS.pinnedIds])) {
      next[STORAGE_KEYS.pinnedIds] = [];
    }
    if (typeof current[STORAGE_KEYS.compactMode] !== "boolean") {
      next[STORAGE_KEYS.compactMode] = false;
    }
    if (Object.keys(next).length > 0) {
      await chrome.storage.local.set(next);
    }
  }

  chrome.runtime.onInstalled.addListener(() => {
    void ensureDefaults();
  });
})();
