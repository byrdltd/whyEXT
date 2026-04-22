(() => {
  const STORAGE_KEYS = {
    enabled: "imageQuickSaveEnabled",
    saveAs: "imageQuickSaveSaveAsDialog"
  };

  function setStatus(message: string) {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    statusEl.textContent = message;
  }

  async function loadSettings() {
    const current = await chrome.storage.local.get([STORAGE_KEYS.enabled, STORAGE_KEYS.saveAs]);
    const rawEnabled = current[STORAGE_KEYS.enabled];
    const rawSaveAs = current[STORAGE_KEYS.saveAs];
    return {
      enabled: typeof rawEnabled === "boolean" ? rawEnabled : true,
      saveAs: typeof rawSaveAs === "boolean" ? rawSaveAs : false
    };
  }

  async function saveSettings(next: { enabled: boolean; saveAs: boolean }) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.enabled]: next.enabled,
      [STORAGE_KEYS.saveAs]: next.saveAs
    });
  }

  async function render() {
    const enabledEl = document.getElementById("enabled") as HTMLInputElement;
    const saveAsEl = document.getElementById("saveAs") as HTMLInputElement;
    const settings = await loadSettings();
    enabledEl.checked = settings.enabled;
    saveAsEl.checked = settings.saveAs;
    setStatus("Settings loaded.");
  }

  async function initOptions() {
    const enabledEl = document.getElementById("enabled") as HTMLInputElement;
    const saveAsEl = document.getElementById("saveAs") as HTMLInputElement;

    const onChange = async () => {
      await saveSettings({
        enabled: enabledEl.checked,
        saveAs: saveAsEl.checked
      });
      setStatus("Saved.");
    };

    enabledEl.addEventListener("change", () => {
      void onChange();
    });
    saveAsEl.addEventListener("change", () => {
      void onChange();
    });

    await render();
  }

  initOptions().catch((error) => {
    setStatus(`Error: ${(error as Error).message}`);
  });
})();
