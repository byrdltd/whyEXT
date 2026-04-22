(() => {
  const STORAGE_KEY = "darkModeDomains";

  function setStatus(message: string) {
    const statusEl = document.getElementById("status") as HTMLParagraphElement;
    statusEl.textContent = message;
  }

  async function getEnabledDomains(): Promise<string[]> {
    const raw = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(raw[STORAGE_KEY]) ? (raw[STORAGE_KEY] as string[]) : [];
  }

  async function setEnabledDomains(domains: string[]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: domains });
  }

  async function renderDomains() {
    const listEl = document.getElementById("domains") as HTMLUListElement;
    listEl.innerHTML = "";

    const domains = await getEnabledDomains();
    if (domains.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No enabled domains.";
      listEl.appendChild(empty);
      return;
    }

    domains.sort().forEach((domain) => {
      const item = document.createElement("li");
      item.textContent = domain;
      listEl.appendChild(item);
    });
  }

  async function clearAll() {
    await setEnabledDomains([]);
    await renderDomains();
    setStatus("Cleared all enabled domains.");
  }

  async function initOptions() {
    document.getElementById("clear-all")?.addEventListener("click", () => {
      void clearAll();
    });
    await renderDomains();
  }

  initOptions().catch((error) => {
    setStatus(`Error: ${(error as Error).message}`);
  });
})();
