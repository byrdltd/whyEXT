(() => {
  const STORAGE_KEYS = {
    enabled: "imageQuickSaveEnabled",
    saveAs: "imageQuickSaveSaveAsDialog"
  };

  async function ensureStorageDefaults() {
    const current = await chrome.storage.local.get([STORAGE_KEYS.enabled, STORAGE_KEYS.saveAs]);
    const next: Record<string, boolean> = {};
    if (typeof current[STORAGE_KEYS.enabled] !== "boolean") {
      next[STORAGE_KEYS.enabled] = true;
    }
    if (typeof current[STORAGE_KEYS.saveAs] !== "boolean") {
      next[STORAGE_KEYS.saveAs] = false;
    }
    if (Object.keys(next).length > 0) {
      await chrome.storage.local.set(next);
    }
  }

  function sanitizeFileName(input: string) {
    return input.replace(/[\\/:*?"<>|]+/g, "_").trim();
  }

  function getNameFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.split("/").filter(Boolean);
      const candidate = pathname[pathname.length - 1] || "image";
      const safe = sanitizeFileName(candidate.split("?")[0]);
      return safe || "image";
    } catch {
      return "image";
    }
  }

  function ensureExtension(fileName: string, sourceUrl: string) {
    if (/\.[a-zA-Z0-9]{2,6}$/.test(fileName)) {
      return fileName;
    }
    try {
      const parsed = new URL(sourceUrl);
      const match = parsed.pathname.match(/\.([a-zA-Z0-9]{2,6})$/);
      if (match) {
        return `${fileName}.${match[1]}`;
      }
    } catch {
      // ignore
    }
    return `${fileName}.jpg`;
  }

  async function downloadImage(url: string, suggestedFileName?: string) {
    const current = await chrome.storage.local.get(STORAGE_KEYS.saveAs);
    const saveAs = Boolean(current[STORAGE_KEYS.saveAs]);
    const fallback = getNameFromUrl(url);
    const fileName = ensureExtension(sanitizeFileName(suggestedFileName || fallback), url);

    return chrome.downloads.download({
      url,
      filename: fileName,
      saveAs
    });
  }

  chrome.runtime.onInstalled.addListener(() => {
    ensureStorageDefaults().catch((error) => {
      console.error("Failed to initialize image quick save:", error);
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "imageQuickSave:download") {
      return false;
    }

    const { imageUrl, fileName } = message as {
      imageUrl?: string;
      fileName?: string;
    };

    if (!imageUrl || typeof imageUrl !== "string") {
      sendResponse({ ok: false, error: "Missing image URL." });
      return true;
    }

    downloadImage(imageUrl, typeof fileName === "string" ? fileName : undefined)
      .then((downloadId) => {
        if (typeof downloadId === "number") {
          sendResponse({ ok: true, downloadId });
          return;
        }
        sendResponse({ ok: false, error: "Download rejected by browser." });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: (error as Error).message });
      });

    return true;
  });
})();
