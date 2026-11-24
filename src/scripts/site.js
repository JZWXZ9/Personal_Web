/* ==========================================================================
   JZWXZ Blog · Minimal Client Interactions
   - Light / Castle Town Dark theme persistence
   - Mobile sidebar drawer
   ========================================================================== */

(function () {
  const STORAGE_THEME = 'jzwxz_theme';
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');

  function getTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_THEME, theme);
    } catch {}
    if (themeLabel) {
      themeLabel.textContent = theme === 'dark' ? '浅色纸墨' : '城堡镇夜色';
    }
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  applyTheme(getTheme());

  themeBtn?.addEventListener('click', () => {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  });

  // Mobile sidebar drawer
  const sidebar = document.getElementById('site-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuBtn = document.getElementById('mobile-menu-btn');

  function setDrawer(open) {
    sidebar?.classList.toggle('is-open', open);
    backdrop?.classList.toggle('is-open', open);
    menuBtn?.setAttribute('aria-expanded', String(open));
  }

  menuBtn?.addEventListener('click', () => {
    setDrawer(!sidebar?.classList.contains('is-open'));
  });

  backdrop?.addEventListener('click', () => setDrawer(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDrawer(false);
  });
})();
