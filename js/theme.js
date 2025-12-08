(function () {
  const STORAGE_KEY = "bm-theme";

  function getInitialPreference() {
    let stored = null;
    try {
      stored = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
    } catch (e) {
      stored = null;
    }

    if (stored === "dark") return true;
    if (stored === "light") return false;

    if (window.matchMedia) {
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch (e) {
        // ignore
      }
    }
    return false;
  }

  function applyTheme(isDark) {
    const body = document.body;
    if (!body) return;

    body.classList.toggle("theme-dark", isDark);

    const toggles = document.querySelectorAll("[data-theme-toggle]");
    toggles.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(isDark));
    });
  }

  function persistPreference(isDark) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
      }
    } catch (e) {
      // ignore storage issues
    }
  }

  function setupToggleHandlers() {
    const toggles = document.querySelectorAll("[data-theme-toggle]");
    if (!toggles.length) return;

    toggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const body = document.body;
        if (!body) return;

        const isDark = !body.classList.contains("theme-dark");
        applyTheme(isDark);
        persistPreference(isDark);
      });
    });
  }

  function init() {
    const prefersDark = getInitialPreference();
    applyTheme(prefersDark);
    setupToggleHandlers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();