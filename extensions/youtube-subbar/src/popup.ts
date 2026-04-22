(() => {
  const STORAGE_KEYS = {
    enabled: "youtubeSubbarEnabled",
    visibilityMode: "youtubeSubbarVisibilityMode"
  };

  type VisibilityMode = "subscriptions-only" | "site-wide";

  async function loadSettings() {
    const current = await chrome.storage.local.get([STORAGE_KEYS.enabled, STORAGE_KEYS.visibilityMode]);
    const rawEnabled = current[STORAGE_KEYS.enabled];
    const rawVisibility = current[STORAGE_KEYS.visibilityMode];
    return {
      enabled: typeof rawEnabled === "boolean" ? rawEnabled : true,
      visibilityMode: rawVisibility === "site-wide" ? "site-wide" : "subscriptions-only"
    } as { enabled: boolean; visibilityMode: VisibilityMode };
  }

  async function saveSettings(settings: { enabled: boolean; visibilityMode: VisibilityMode }) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.enabled]: settings.enabled,
      [STORAGE_KEYS.visibilityMode]: settings.visibilityMode
    });
  }

  async function render() {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    const enabledEl = document.getElementById("enabled") as HTMLInputElement;
    const visibilityEl = document.getElementById("visibility-mode") as HTMLSelectElement;
    const settings = await loadSettings();
    enabledEl.checked = settings.enabled;
    visibilityEl.value = settings.visibilityMode;
    statusEl.textContent = settings.enabled
      ? `Active (${settings.visibilityMode === "site-wide" ? "site-wide" : "subscriptions-only"}).`
      : "Disabled.";
  }

  async function init() {
    const enabledEl = document.getElementById("enabled") as HTMLInputElement;
    const visibilityEl = document.getElementById("visibility-mode") as HTMLSelectElement;
    const optionsBtn = document.getElementById("open-options") as HTMLButtonElement;

    const persist = async () => {
      await saveSettings({
        enabled: enabledEl.checked,
        visibilityMode: visibilityEl.value === "site-wide" ? "site-wide" : "subscriptions-only"
      });
      await render();
    };

    enabledEl.addEventListener("change", () => {
      void persist();
    });
    visibilityEl.addEventListener("change", () => {
      void persist();
    });
    optionsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    await render();
  }

  void init();
})();
