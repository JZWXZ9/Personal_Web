/*
  JZWXZ Portfolio · Minimal interactions
  这个文件只负责两件事：移动端导航展开，以及滚动时同步导航高亮。
  页面主体仍然是静态 HTML，方便以后迁移到 Markdown / Astro。
*/

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');
const navLinks = [...document.querySelectorAll('.nav-link')];

// 移动端菜单：点击按钮时切换显示状态，并同步 aria-expanded 方便读屏软件识别。
menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

// 点击导航后自动收起移动端菜单，避免遮挡新跳转到的内容。
navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    mainNav?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

// 使用 IntersectionObserver 判断当前阅读到的区块，并更新导航高亮。
const sections = [...document.querySelectorAll('main section[id]')];
const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`);
    });
  },
  { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.5] },
);

sections.forEach((section) => sectionObserver.observe(section));
