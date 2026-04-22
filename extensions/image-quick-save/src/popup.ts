(() => {
  const STORAGE_KEYS = {
    enabled: "imageQuickSaveEnabled"
  };

  async function getEnabledState() {
    const current = await chrome.storage.local.get(STORAGE_KEYS.enabled);
    if (typeof current[STORAGE_KEYS.enabled] === "boolean") {
      return current[STORAGE_KEYS.enabled];
    }
    return true;
  }

  async function setEnabledState(enabled: boolean) {
    await chrome.storage.local.set({ [STORAGE_KEYS.enabled]: enabled });
  }

  async function render() {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    const toggleBtn = document.getElementById("toggle-enabled") as HTMLButtonElement;

    const enabled = await getEnabledState();
    statusEl.textContent = enabled
      ? "Hover button is enabled on image elements."
      : "Hover button is disabled.";
    toggleBtn.textContent = enabled ? "Disable hover save button" : "Enable hover save button";
  }

  async function init() {
    const toggleBtn = document.getElementById("toggle-enabled") as HTMLButtonElement;
    const optionsBtn = document.getElementById("open-options") as HTMLButtonElement;

    toggleBtn.addEventListener("click", async () => {
      const enabled = await getEnabledState();
      await setEnabledState(!enabled);
      await render();
    });

    optionsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    await render();
  }

  init().catch((error) => {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    statusEl.textContent = `Error: ${(error as Error).message}`;
  });
})();
