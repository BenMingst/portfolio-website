document.addEventListener("DOMContentLoaded", function () {
  setupScrollButtons();
  setupOutlineLinks();
  setupSectionObserver();
  setupRibbonTabs();
  setupWindowControls();
  setupHelpModal();
  setupBrowserCollapse();
});

/**
 * Attach smooth scroll behavior to any element with [data-scroll].
 */
function setupScrollButtons() {
  const scrollElements = document.querySelectorAll("[data-scroll]");

  scrollElements.forEach((el) => {
    el.addEventListener("click", function (event) {
      const target = el.getAttribute("data-scroll");
      if (!target) return;

      event.preventDefault();

      if (target === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const section = document.querySelector(target);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

/**
 * Basic behavior for left outline links (these already use hashes).
 * We override to ensure smooth scrolling and later allow active-state sync.
 */
function setupOutlineLinks() {
  const outlineLinks = document.querySelectorAll(".cad-outline a[href^='#']");

  outlineLinks.forEach((link) => {
    link.addEventListener("click", function (event) {
      const href = link.getAttribute("href");
      if (!href) return;

      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

/**
 * Highlight the current section in the left outline as the user scrolls.
 */
function setupSectionObserver() {
  const sections = document.querySelectorAll("main.cad-workspace section[id]");
  const outlineLinks = document.querySelectorAll(".cad-outline a[href^='#']");

  if (!sections.length || !outlineLinks.length) {
    return;
  }

  const linkMap = new Map();
  outlineLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      linkMap.set(href.slice(1), link);
    }
  });

  let activeId = null;

  const observer = new IntersectionObserver(
    (entries) => {
      let bestEntry = null;

      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (
          !bestEntry ||
          entry.intersectionRatio > bestEntry.intersectionRatio
        ) {
          bestEntry = entry;
        }
      });

      if (!bestEntry) return;

      const id = bestEntry.target.id;
      if (id === activeId) return;
      activeId = id;

      outlineLinks.forEach((link) =>
        link.classList.remove("cad-outline-link--active"),
      );

      const linked = linkMap.get(id);
      if (linked) {
        linked.classList.add("cad-outline-link--active");
      }
    },
    {
      root: null,
      rootMargin: "-50% 0px -45% 0px",
      threshold: [0.2, 0.5, 0.8],
    },
  );

  sections.forEach((section) => observer.observe(section));
}

/**
 * Very light behavior for the top ribbon tabs.
 * For now they visually switch the active tab and log the intended page.
 * Later this can be extended to actually swap page content while keeping the shell.
 */
function setupRibbonTabs() {
  const tabs = document.querySelectorAll(".cad-tab[data-tab][data-scroll]");
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Update visual active state
      tabs.forEach((t) => {
        t.classList.remove("cad-tab-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("cad-tab-active");
      tab.setAttribute("aria-selected", "true");

      // Smooth scroll to the corresponding section
      const targetSelector = tab.getAttribute("data-scroll");
      if (!targetSelector) return;

      const section = document.querySelector(targetSelector);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

/**
 * Setup fullscreen toggle button.
 *
 * Simple behavior:
 * - Uses the browser Fullscreen API (like pressing F11 for this tab).
 * - No persistence: state is reset on navigation/refresh per browser rules.
 */
function setupWindowControls() {
  const maxBtn = document.querySelector('.cad-window-btn-max');
  if (!maxBtn) return;

  let isMaximized = false;

  function syncUiWithFullscreen() {
    isMaximized = !!(document.fullscreenElement ||
                     document.webkitFullscreenElement ||
                     document.msFullscreenElement);

    if (isMaximized) {
      maxBtn.classList.add('fullscreen-active');
      maxBtn.setAttribute('aria-label', 'Exit fullscreen');
      maxBtn.setAttribute('title', 'Exit fullscreen');
    } else {
      maxBtn.classList.remove('fullscreen-active');
      maxBtn.setAttribute('aria-label', 'Enter fullscreen');
      maxBtn.setAttribute('title', 'Enter fullscreen');
    }
  }

  function handleFullscreenChange() {
    syncUiWithFullscreen();
  }

  // Toggle fullscreen mode (like F11)
  maxBtn.addEventListener('click', function () {
    if (isMaximized) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
      }
      return;
    }

    // Enter fullscreen
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
      elem.msRequestFullscreen();
    }
  });

  // Listen for fullscreen changes (including F11 or Escape key)
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);

  // Initial sync with the actual fullscreen state for this document
  syncUiWithFullscreen();
}


/**
 * Setup collapsible left "Page" browser panel shared across pages.
 */
function setupBrowserCollapse() {
  const main = document.querySelector(".cad-main");
  const browser = document.querySelector(".cad-browser");
  const viewport = document.querySelector(".cad-viewport");

  if (!main || !browser || !viewport) {
    return;
  }

  // Create / insert toggle handle between browser and viewport
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "cad-browser-toggle";
  toggle.setAttribute("aria-label", "Toggle navigation panel");
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("title", "Hide Page navigation");
  toggle.textContent = "◀";

  main.insertBefore(toggle, viewport);

  const STORAGE_KEY = "cad-browser-collapsed";

  function applyState(collapsed) {
    if (collapsed) {
      main.classList.add("cad-main--browser-collapsed");
      toggle.textContent = "▶";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("title", "Show Page navigation");
    } else {
      main.classList.remove("cad-main--browser-collapsed");
      toggle.textContent = "◀";
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("title", "Hide Page navigation");
    }
  }

  // Initial state from localStorage
  const saved = window.localStorage
    ? window.localStorage.getItem(STORAGE_KEY)
    : null;
  applyState(saved === "1");

  toggle.addEventListener("click", () => {
    const isCollapsed = main.classList.toggle("cad-main--browser-collapsed");
    applyState(isCollapsed);
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
    }
  });
}

/**
 * Setup "How to navigate" help modal on the home page.
 */
function setupHelpModal() {
  const helpButton = document.getElementById("help-how-to-button");
  const modal = document.getElementById("help-how-to-modal");
  if (!helpButton || !modal) {
    return;
  }

  const closeButtons = modal.querySelectorAll("[data-help-close]");

  function openModal() {
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
  }

  helpButton.addEventListener("click", (event) => {
    event.preventDefault();
    openModal();
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      closeModal();
    });
  });

  // Close when clicking backdrop (outside dialog)
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}