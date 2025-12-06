document.addEventListener("DOMContentLoaded", function () {
  setupScrollButtons();
  setupOutlineLinks();
  setupSectionObserver();
  setupRibbonTabs();
  setupWindowControls();
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
  const tabs = document.querySelectorAll(".cad-ribbon-tab[data-page]");
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const page = tab.getAttribute("data-page");

      tabs.forEach((t) => t.classList.remove("cad-ribbon-tab--active"));
      tab.classList.add("cad-ribbon-tab--active");

      // Placeholder for future routing between main pages.
      if (page && page !== "home") {
        console.info(
          "[CAD shell] Ribbon page change requested:",
          page,
          "- content routing not implemented yet.",
        );
      }
    });
  });
}

/**
 * Setup fullscreen toggle button
 */
function setupWindowControls() {
  const maxBtn = document.querySelector('.cad-window-btn-max');
  
  if (!maxBtn) return;

  let isMaximized = false;

  // Toggle fullscreen mode (like F11)
  maxBtn.addEventListener('click', function() {
    if (!isMaximized) {
      // Enter fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
      }
    }
  });

  // Listen for fullscreen changes (including F11 or Escape key)
  document.addEventListener('fullscreenchange', updateMaximizeState);
  document.addEventListener('webkitfullscreenchange', updateMaximizeState);
  document.addEventListener('msfullscreenchange', updateMaximizeState);

  function updateMaximizeState() {
    isMaximized = !!(document.fullscreenElement ||
                     document.webkitFullscreenElement ||
                     document.msFullscreenElement);
    if (isMaximized) {
      maxBtn.classList.add('fullscreen-active');
      maxBtn.setAttribute('aria-label', 'Exit fullscreen');
      maxBtn.setAttribute('title', 'Exit fullscreen (Esc)');
    } else {
      maxBtn.classList.remove('fullscreen-active');
      maxBtn.setAttribute('aria-label', 'Enter fullscreen');
      maxBtn.setAttribute('title', 'Enter fullscreen (F11)');
    }
  }
}