/**
 * CAD-style Ribbon Component
 * Renders a consistent ribbon interface across all pages
 */

/**
 * Renders the ribbon with the specified active tab
 * @param {string} activeTab - The slug of the active tab
 *   (home, experience, projects, skills, awards, 3d-viewer)
 */
function renderRibbon(activeTab = 'home') {
  const ribbonContainer = document.querySelector('.cad-ribbon-bar');
  
  if (!ribbonContainer) return;

  const tabs = [
    { slug: 'home', label: 'Home', href: '/index.html' },
    { slug: 'experience', label: 'Experience', href: '/pages/experience.html' },
    { slug: 'projects', label: 'Projects', href: '/pages/projects.html' },
    { slug: 'skills', label: 'Skills', href: '/pages/skills.html' },
    { slug: 'awards', label: 'Awards & Certs', href: '/pages/awards.html' },
    { slug: '3d-viewer', label: '3D Viewer', href: '/pages/3d-viewer.html' }
  ];

  const tabsMarkup = tabs
    .map(
      (tab) => `
        <button
          class="cad-tab ${tab.slug === activeTab ? 'cad-tab-active' : ''}"
          type="button"
          data-tab="${tab.slug}"
          role="tab"
          aria-selected="${tab.slug === activeTab}"
          onclick="window.location.href='${tab.href}'"
        >
          ${tab.label}
        </button>
      `,
    )
    .join('');

  ribbonContainer.innerHTML = `
    <div class="cad-ribbon-top">
      <div class="cad-ribbon-tabs" role="tablist">
        ${tabsMarkup}
      </div>
      
    </div>

    <div class="cad-ribbon-groups">
      <!-- Help group -->
      <section
        class="cad-ribbon-group"
        data-group="help"
        aria-label="Help"
      >
        <h2 class="cad-ribbon-group-title">Help</h2>
        <div class="cad-ribbon-icons-row">
          <button
            type="button"
            class="cad-ribbon-icon-btn"
            onclick="window.location.href='/index.html'"
          >
            <span class="cad-ribbon-icon-large">❔</span>
            <span class="cad-ribbon-icon-label">How to navigate</span>
          </button>
        </div>
      </section>

      <!-- Social group -->
      <section
        class="cad-ribbon-group"
        data-group="social"
        aria-label="Social links"
      >
        <h2 class="cad-ribbon-group-title">Social</h2>
        <div class="cad-ribbon-icons-row">
          <a
            class="cad-ribbon-icon-btn"
            href="https://www.youtube.com"
            target="_blank"
            rel="noreferrer"
          >
            <span class="cad-ribbon-icon-small">▶</span>
            <span class="cad-ribbon-icon-label">YouTube</span>
          </a>
          <a
            class="cad-ribbon-icon-btn"
            href="https://linkedin.com/in/benjamin-mingst"
            target="_blank"
            rel="noreferrer"
          >
            <span class="cad-ribbon-icon-small">in</span>
            <span class="cad-ribbon-icon-label">LinkedIn</span>
          </a>
          <a
            class="cad-ribbon-icon-btn"
            href="https://github.com/BenMingst"
            target="_blank"
            rel="noreferrer"
          >
            <span class="cad-ribbon-icon-small">🐱</span>
            <span class="cad-ribbon-icon-label">GitHub</span>
          </a>
        </div>
      </section>

      <!-- Resources group -->
      <section
        class="cad-ribbon-group"
        data-group="resources"
        aria-label="Resources"
      >
        <h2 class="cad-ribbon-group-title">Resources</h2>
        <div class="cad-ribbon-icons-row">
          <a
            class="cad-ribbon-icon-btn"
            href="/media/Benjamin_Mingst_Resume.pdf"
            download
          >
            <span class="cad-ribbon-icon-large">📄</span>
            <span class="cad-ribbon-icon-label">Resume / CV</span>
          </a>
        </div>
      </section>

      <!-- Connect group -->
      <section
        class="cad-ribbon-group"
        data-group="connect"
        aria-label="Connect"
      >
        <h2 class="cad-ribbon-group-title">Connect</h2>
        <div class="cad-ribbon-icons-row">
          <a
            class="cad-ribbon-icon-btn"
            href="mailto:benjaminmingst@outlook.com"
          >
            <span class="cad-ribbon-icon-large">✉</span>
            <span class="cad-ribbon-icon-label">Email Me</span>
          </a>
          <a
            class="cad-ribbon-icon-btn"
            href="https://calendly.com/your-scheduling-link"
            target="_blank"
            rel="noreferrer"
          >
            <span class="cad-ribbon-icon-large">📞</span>
            <span class="cad-ribbon-icon-label">Schedule a Call</span>
          </a>
        </div>
      </section>
    </div>
  `;
}

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Get active tab from data attribute on body or default to home
  const activeTab = document.body.getAttribute('data-page') || 'home';
  renderRibbon(activeTab);
});