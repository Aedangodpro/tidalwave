/* about:blank launcher
 * Opens a URL inside N freshly-spawned about:blank tabs (each one hosts a full-size iframe).
 */
(() => {
  "use strict";

  const STORAGE_KEY = "aboutBlankLauncher.url";
  const MIN_TABS = 1;
  const MAX_TABS = 20;
  const SAVE_DEBOUNCE_MS = 250;

  // Anything that already carries a scheme is parsed as-is; the rest gets https:// prepended.
  const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

  // Built once at startup so a launch only splices in one attribute instead of
  // building markup per tab. Deliberately tiny to keep the parse cost negligible.
  const TAB_SHELL =
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>about:blank</title>' +
    '<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}' +
    'iframe{border:0;display:block;width:100%;height:100%}</style>' +
    '<iframe __SRC__ loading="eager"></iframe>';

  const urlInput = document.getElementById("urlInput");
  const countInput = document.getElementById("countInput");
  const launchBtn = document.getElementById("launchBtn");
  const statusEl = document.getElementById("status");
  const themeToggle = document.getElementById("themeToggle");
  const root = document.documentElement;

  let saveTimer = 0;

  /* ---------------------------------------------------------------- URLs -- */

  function normalizeUrl(raw) {
    const value = raw.trim();
    if (!value) throw new Error("Enter a URL first.");

    let parsed;
    try {
      parsed = new URL(SCHEME_PATTERN.test(value) ? value : "https://" + value);
    } catch {
      throw new Error("That doesn't look like a valid URL.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Only http:// and https:// links can be launched.");
    }
    if (!parsed.hostname) throw new Error("That doesn't look like a valid URL.");

    return parsed.href;
  }

  function parseTabCount(raw) {
    const count = Number.parseInt(raw, 10);
    if (!Number.isInteger(count) || count < MIN_TABS || count > MAX_TABS) {
      throw new Error("Enter a number of tabs between " + MIN_TABS + " and " + MAX_TABS + ".");
    }
    return count;
  }

  function escapeAttribute(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* --------------------------------------------------------- Persistence -- */

  function storeUrl(value) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage may be unavailable (private mode, file://). Launching still works. */
    }
  }

  function loadUrl() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  /* -------------------------------------------------------------- Status -- */

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
  }

  function clearStatus() {
    if (statusEl.textContent) setStatus("");
  }

  /* ------------------------------------------------------------ Launching -- */

  function launch() {
    let target;
    let count;
    try {
      target = normalizeUrl(urlInput.value);
      count = parseTabCount(countInput.value);
    } catch (error) {
      setStatus(error.message, true);
      urlInput.focus();
      return;
    }

    storeUrl(target);

    const markup = TAB_SHELL.replace("__SRC__", 'src="' + escapeAttribute(target) + '"');

    // Open every window synchronously inside the user gesture — popup blockers only
    // allow window.open() calls made during the click/Enter event itself.
    const tabs = [];
    for (let i = 0; i < count; i++) tabs.push(window.open("about:blank", "_blank"));

    let opened = 0;
    for (const tab of tabs) {
      if (!tab) continue;
      try {
        tab.document.write(markup);
        tab.document.close();
        opened++;
      } catch {
        // Some browsers refuse document.write on about:blank: load the URL directly.
        try {
          tab.location.replace(target);
          opened++;
        } catch {
          try {
            tab.close();
          } catch {
            /* window already gone */
          }
        }
      }
    }

    if (opened === 0) {
      setStatus("No tabs could be opened. Allow pop-ups for this page and try again.", true);
    } else if (opened < count) {
      setStatus("Opened " + opened + " of " + count + " tabs — allow pop-ups to open the rest.", true);
    } else {
      setStatus("Launched " + count + (count === 1 ? " tab." : " tabs."));
    }
  }

  /* --------------------------------------------------------------- Theme -- */

  function applyTheme(dark) {
    root.classList.toggle("dark", dark);
    themeToggle.textContent = dark ? "\u2600 Day mode" : "\u263E Night mode";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.setAttribute("aria-label", dark ? "Switch to day mode" : "Switch to night mode");
  }

  function toggleTheme() {
    applyTheme(!root.classList.contains("dark"));
  }

  themeToggle.addEventListener("click", toggleTheme);

  // "n" flips the theme too, unless the user is actually typing in a field.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "n" && event.key !== "N") return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    ) {
      return;
    }

    event.preventDefault();
    toggleTheme();
  });

  /* -------------------------------------------------------------- Wiring -- */

  function handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      launch();
    }
  }

  urlInput.value = loadUrl();

  urlInput.addEventListener("keydown", handleKeydown);
  countInput.addEventListener("keydown", handleKeydown);
  launchBtn.addEventListener("click", launch);

  urlInput.addEventListener("input", () => {
    clearStatus();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => storeUrl(urlInput.value.trim()), SAVE_DEBOUNCE_MS);
  });

  // The launcher is the whole page, so start the user in the URL field with the
  // caret after whatever was restored.
  urlInput.focus();
  urlInput.setSelectionRange(urlInput.value.length, urlInput.value.length);
})();
