import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { Marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');
const SRC = path.join(ROOT, 'src');

const SITE = {
  brand: 'JZWXZ',
  domain: 'blog.jzwxz9.space',
  githubUser: 'JZWXZ9',
  githubUrl: 'https://github.com/JZWXZ9',
  email: 'JZWXZ9@qq.com',
  year: '2026',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugifyHeading(text, usedSlugs) {
  const plain = String(text ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const base = plain || 'section';
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${n++}`;
  }
  usedSlugs.add(slug);
  return slug;
}

function renderMarkdownWithToc(rawMarkdown) {
  const codePlaceholders = [];
  const mathPlaceholders = [];
  const headings = [];
  const usedSlugs = new Set();

  let text = rawMarkdown.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    const token = `@@CODE_BLOCK_${codePlaceholders.length}@@`;
    codePlaceholders.push(match);
    return token;
  });

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const html = katex.renderToString(expr.trim(), {
      displayMode: true,
      throwOnError: false,
      strict: 'ignore',
    });
    const token = `@@MATH_BLOCK_${mathPlaceholders.length}@@`;
    mathPlaceholders.push(html);
    return `\n\n${token}\n\n`;
  });

  text = text.replace(/(?<!\\)\$(?!\$)([^\n$]+?)(?<!\\)\$/g, (_, expr) => {
    const html = katex.renderToString(expr.trim(), {
      displayMode: false,
      throwOnError: false,
      strict: 'ignore',
    });
    const token = `@@MATH_INLINE_${mathPlaceholders.length}@@`;
    mathPlaceholders.push(html);
    return token;
  });

  text = text.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, idx) => codePlaceholders[Number(idx)]);

  const instance = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      code({ text: codeText, lang }) {
        const language = lang && hljs.getLanguage(lang) ? lang : null;
        const highlighted = language
          ? hljs.highlight(codeText, { language }).value
          : escapeHtml(codeText);
        const cls = language ? ` class="hljs language-${escapeHtml(language)}"` : ' class="hljs"';
        return `<pre><code${cls}>${highlighted}</code></pre>\n`;
      },
      heading({ tokens, depth }) {
        const innerHtml = this.parser.parseInline(tokens);
        if (depth === 2 || depth === 3) {
          const cleanText = innerHtml.replace(/<[^>]+>/g, '').trim();
          const id = slugifyHeading(cleanText, usedSlugs);
          headings.push({ depth, id, text: cleanText });
          return `<h${depth} id="${escapeHtml(id)}"><a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="定位到此小节">#</a>${innerHtml}</h${depth}>\n`;
        }
        return `<h${depth}>${innerHtml}</h${depth}>\n`;
      },
    },
  });

  let html = instance.parse(text);
  html = html.replace(/<p>@@MATH_BLOCK_(\d+)@@<\/p>/g, (_, idx) => mathPlaceholders[Number(idx)]);
  html = html.replace(/@@MATH_(?:BLOCK|INLINE)_(\d+)@@/g, (_, idx) => mathPlaceholders[Number(idx)]);

  return { html, headings };
}

function renderMarkdown(rawMarkdown) {
  return renderMarkdownWithToc(rawMarkdown).html;
}

function renderArticleToc(headings) {
  const topCount = headings.filter((h) => h.depth === 2).length;
  if (topCount < 2) return '';

  return `
    <details class="article-toc">
      <summary class="article-toc-summary">
        <span>本文目录</span>
        <span class="article-toc-count">${headings.length} 节</span>
      </summary>
      <nav class="article-toc-nav" aria-label="文章目录">
        ${headings
          .map(
            (h) =>
              `<a class="article-toc-link${h.depth === 3 ? ' is-sub' : ''}" href="#${escapeHtml(h.id)}">${escapeHtml(h.text)}</a>`
          )
          .join('')}
      </nav>
    </details>`;
}

function formatDate(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) return dateVal.toISOString().slice(0, 10);
  return String(dateVal).slice(0, 10);
}

function estimateReadingMinutes(markdownText) {
  const plain = markdownText.replace(/```[\s\S]*?```/g, '').replace(/[#>*`_\-$]/g, '');
  const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (plain.replace(/[\u4e00-\u9fff]/g, ' ').match(/\b\w+\b/g) || []).length;
  return Math.max(1, Math.ceil((cjk + words * 1.5) / 360));
}

async function loadCollection(folderName) {
  const dir = path.join(CONTENT, folderName);
  let files = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  const items = [];
  for (const file of files) {
    if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
    const raw = await fs.readFile(path.join(dir, file), 'utf-8');
    const { data, content } = matter(raw);
    if (data.draft === true) continue;

    const slug = file.replace(/\.md$/i, '');
    const rendered = content.trim().length > 0 ? renderMarkdownWithToc(content) : { html: '', headings: [] };
    items.push({
      slug,
      href: `/${folderName}/${encodeURIComponent(slug)}/`,
      title: data.title || slug,
      shortTitle: data.shortTitle || data.title || slug,
      subtitle: data.subtitle || '',
      date: formatDate(data.date),
      order: typeof data.order === 'number' ? data.order : null,
      summary: data.summary || data.subtitle || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      status: data.status || '',
      github: data.github || '',
      repo: data.repo || '',
      pdf: data.pdf || '',
      pdfFilename: data.pdfFilename || (data.pdf ? path.basename(data.pdf) : ''),
      version: data.version || '',
      pages: data.pages || null,
      toolchain: data.toolchain || '',
      reference: data.reference || '',
      chapters: Array.isArray(data.chapters) ? data.chapters : [],
      steps: Array.isArray(data.steps) ? data.steps : [],
      readingMinutes: estimateReadingMinutes(content),
      hasBody: content.trim().length > 0,
      html: rendered.html,
      headings: rendered.headings,
    });
  }

  items.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN');
  });

  return items;
}

function buildNavTree(collections) {
  return [
    { id: 'home', index: '00', label: '首页', en: 'Home', href: '/', children: [] },
    { id: 'about', index: '01', label: '简介', en: 'About', href: '/about/', children: [] },
    {
      id: 'blog',
      index: '02',
      label: '随笔',
      en: 'Blog',
      href: '/blog/',
      children: collections.blog.map((item) => ({
        slug: item.slug,
        label: item.shortTitle,
        href: item.href,
      })),
    },
    {
      id: 'notes',
      index: '03',
      label: '笔记',
      en: 'Notes',
      href: '/notes/',
      children: collections.notes.map((item) => ({
        slug: item.slug,
        label: item.shortTitle,
        href: item.href,
      })),
    },
    {
      id: 'projects',
      index: '04',
      label: '项目',
      en: 'Projects',
      href: '/projects/',
      children: collections.projects.map((item) => ({
        slug: item.slug,
        label: item.shortTitle,
        href: item.href,
      })),
    },
  ];
}

function renderSidebarNav(navTree, activeNav, activeSlug = '') {
  return navTree
    .map((group) => {
      const isSectionMatch = group.id === activeNav;
      const isDirectLink = group.id === 'home' || group.id === 'about';

      if (isDirectLink) {
        const isActive = isSectionMatch;
        return `
          <div class="nav-group">
            <a class="nav-item${isActive ? ' is-active' : ''}" href="${group.href}"${isActive ? ' aria-current="page"' : ''}>
              <span class="nav-index">${group.index}</span>
              <span>${group.label}</span>
              <span class="nav-en">${group.en}</span>
            </a>
          </div>`;
      }

      // Collapsible PDF-outline / Hextra-style folder group
      const isOpenByDefault = isSectionMatch;
      const subListId = `nav-sub-${group.id}`;

      const subItemsHtml =
        group.children.length > 0
          ? group.children
              .map((child) => {
                const childActive = isSectionMatch && activeSlug === child.slug;
                return `
                  <a
                    class="nav-subitem${childActive ? ' is-active' : ''}"
                    href="${child.href}"${childActive ? ' aria-current="page"' : ''}
                    title="${escapeHtml(child.label)}"
                  >${escapeHtml(child.label)}</a>`;
              })
              .join('')
          : `<a class="nav-subitem${isSectionMatch && !activeSlug ? ' is-active' : ''}" href="${group.href}">暂无内容</a>`;

      return `
        <div class="nav-group${isOpenByDefault ? ' is-open' : ''}" data-nav-group="${group.id}">
          <button
            type="button"
            class="nav-folder${isSectionMatch ? ' is-parent-active' : ''}"
            aria-expanded="${isOpenByDefault ? 'true' : 'false'}"
            aria-controls="${subListId}"
          >
            <span class="nav-index">${group.index}</span>
            <span class="nav-label">${group.label}</span>
            <svg class="nav-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" />
            </svg>
          </button>
          <div class="nav-sublist" id="${subListId}">
            ${subItemsHtml}
          </div>
        </div>`;
    })
    .join('');
}

function renderLayout({
  title,
  description,
  activeNav,
  activeSlug = '',
  navTree,
  assetHashes,
  contentHtml,
  includeKatex = false,
}) {
  const fullTitle = activeNav === 'home' ? `${SITE.brand} · 个人博客` : `${title} · ${SITE.brand}`;
  const navHtml = renderSidebarNav(navTree, activeNav, activeSlug);
  const katexLink = includeKatex
    ? `<link rel="stylesheet" href="/assets/katex/katex.min.css" />`
    : '';
  const cssHref = `/assets/main.css?v=${assetHashes.css}`;
  const jsHref = `/assets/site.js?v=${assetHashes.js}`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(fullTitle)}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    ${katexLink}
    <link rel="stylesheet" href="${cssHref}" />
    <script>
      (function () {
        try {
          var t = localStorage.getItem('jzwxz_theme');
          if (t === 'dark' || t === 'light') {
            document.documentElement.setAttribute('data-theme', t);
          }
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <header class="mobile-header">
      <a class="brand-link" href="/">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>${SITE.brand}</span>
      </a>
      <button
        type="button"
        class="mobile-menu-btn"
        id="mobile-menu-btn"
        aria-expanded="false"
        aria-controls="site-sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
        <span>目录</span>
      </button>
    </header>

    <div class="castle-backdrop" aria-hidden="true">
      <div class="castle-backdrop-image"></div>
      <canvas class="castle-backdrop-fx" id="castle-fx-canvas"></canvas>
      <div class="castle-backdrop-ralsei">
        <div class="castle-ralsei-shadow"></div>
        <div class="castle-ralsei-sprite pixel-art"></div>
      </div>
      <div class="castle-backdrop-scrim"></div>
    </div>

    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

    <div class="app-shell">
      <aside class="sidebar" id="site-sidebar" aria-label="站点导航">
        <div class="sidebar-brand">
          <a class="brand-link" href="/">
            <span class="brand-mark" aria-hidden="true"></span>
            <span>${SITE.brand}</span>
          </a>
          <p class="brand-sub">Study · Notes · Code</p>
        </div>

        <nav class="sidebar-nav" aria-label="主索引">
          ${navHtml}
        </nav>

        <div class="ralsei-mascot" aria-hidden="true">
          <img
            class="ralsei-sprite ralsei-sprite--light pixel-art"
            src="/assets/deltarune/ralsei-ch2.png"
            alt=""
          />
          <img
            class="ralsei-sprite ralsei-sprite--dark pixel-art"
            src="/assets/deltarune/ralsei-ch1.png"
            alt=""
          />
        </div>

        <div class="sidebar-footer">
          <button type="button" class="theme-toggle" id="theme-toggle" aria-pressed="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
            <span id="theme-label">城堡镇夜色</span>
          </button>

          <div class="social-links">
            <a class="icon-link" href="${SITE.githubUrl}" target="_blank" rel="noreferrer" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
              </svg>
            </a>
            <a class="icon-link" href="mailto:${SITE.email}" aria-label="Email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </a>
          </div>
        </div>
      </aside>

      <div class="main-wrap">
        <main class="main-content">
          ${contentHtml}
        </main>
        <footer class="page-footer">
          <span>© ${SITE.year} ${SITE.brand} · ${SITE.domain}</span>
          <span>Castle Town · Minimalist Archive</span>
        </footer>
      </div>
    </div>

    <script src="${jsHref}" defer></script>
  </body>
</html>
`;
}

async function copyDir(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function writeHtml(relativePath, html) {
  const target = path.join(DIST, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html, 'utf-8');
}

function buildHomePage(collections, navTree, assetHashes) {
  const latestPost = collections.blog[0];
  const featuredNote = collections.notes[0];
  const featuredProject = collections.projects[0];

  const blogSummary = latestPost
    ? `最新：《${escapeHtml(latestPost.title)}》（${latestPost.date}），共 ${collections.blog.length} 篇。`
    : '还没有写下第一篇随笔，支持 Markdown 与数学公式，随时落笔。';

  const noteSummary = featuredNote
    ? `${escapeHtml(featuredNote.title)}（共 ${collections.notes.length} 份笔记），支持站内在线翻阅与下载。`
    : '系统整理数学与课程学习笔记。';

  const projectSummary = featuredProject
    ? `${escapeHtml(featuredProject.subtitle || featuredProject.summary)}`
    : '记录自己动手完成的实用工具与代码项目。';

  const contentHtml = `
    <div class="home-layout">
      <section class="welcome-hero">
        <p class="page-kicker">WELCOME · JZWXZ</p>
        <h1 class="page-title">你好，这里是 JZWXZ。</h1>
        <p class="welcome-lead">
          一个安静的个人角落，用来收放随手写下的短文、认真排版过的数学学习笔记，以及自己动手做的小项目。从左侧二级目录可直接定位每一篇文章、笔记或项目。
        </p>
      </section>

      <section class="home-directory" aria-labelledby="home-index-label">
        <p class="section-label" id="home-index-label">INDEX · 站点目录</p>
        <div class="index-grid">
          <a class="index-card" href="/blog/">
            <div class="index-card-top">
              <span>02 / BLOG</span>
              <span>${collections.blog.length} POST${collections.blog.length === 1 ? '' : 'S'}</span>
            </div>
            <h2>随手博客</h2>
            <p>${blogSummary}</p>
            <div class="index-card-foot">
              <span>进入随笔</span>
              <span aria-hidden="true">→</span>
            </div>
          </a>

          <a class="index-card" href="${featuredNote ? featuredNote.href : '/notes/'}">
            <div class="index-card-top">
              <span>03 / NOTES</span>
              <span>${featuredNote?.pages ? `${featuredNote.pages} PAGES PDF` : `${collections.notes.length} NOTES`}</span>
            </div>
            <h2>${escapeHtml(featuredNote ? featuredNote.title : '学习笔记')}</h2>
            <p>${noteSummary}</p>
            <div class="index-card-foot">
              <span>阅读笔记</span>
              <span aria-hidden="true">→</span>
            </div>
          </a>

          <a class="index-card" href="${featuredProject ? featuredProject.href : '/projects/'}">
            <div class="index-card-top">
              <span>04 / PROJECT</span>
              <span>${collections.projects.length} PROJECT${collections.projects.length === 1 ? '' : 'S'}</span>
            </div>
            <h2>${escapeHtml(featuredProject ? featuredProject.title : '项目介绍')}</h2>
            <p>${projectSummary}</p>
            <div class="index-card-foot">
              <span>查看项目</span>
              <span aria-hidden="true">→</span>
            </div>
          </a>
        </div>
      </section>
    </div>
  `;

  return renderLayout({
    title: '首页',
    description: 'JZWXZ 的个人博客：随手博客、抽象代数学习笔记与个人项目。',
    activeNav: 'home',
    navTree,
    assetHashes,
    contentHtml,
  });
}

async function buildAboutPage(navTree, assetHashes) {
  const raw = await fs.readFile(path.join(CONTENT, 'pages', 'about.md'), 'utf-8');
  const { data, content } = matter(raw);
  const bodyHtml = renderMarkdown(content);

  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">01 / ABOUT</p>
      <h1 class="page-title">${escapeHtml(data.title || '关于')}</h1>
      <p class="page-subtitle">${escapeHtml(data.subtitle || '')}</p>
    </header>

    <article class="prose">
      ${bodyHtml}
    </article>

    <section class="contact-grid" aria-label="联系方式">
      <a class="contact-card" href="${SITE.githubUrl}" target="_blank" rel="noreferrer">
        <div>
          <span class="contact-label">GITHUB</span>
          <span class="contact-value">@${SITE.githubUser}</span>
        </div>
        <span aria-hidden="true">↗</span>
      </a>
      <a class="contact-card" href="mailto:${SITE.email}">
        <div>
          <span class="contact-label">EMAIL</span>
          <span class="contact-value">${SITE.email}</span>
        </div>
        <span aria-hidden="true">↗</span>
      </a>
    </section>
  `;

  return renderLayout({
    title: data.title || '简介',
    description: '关于 JZWXZ：学习方向、常用工具与联系方式。',
    activeNav: 'about',
    navTree,
    assetHashes,
    contentHtml,
  });
}

function buildBlogIndexPage(posts, navTree, assetHashes) {
  const listHtml =
    posts.length > 0
      ? `<div class="blog-list">
          ${posts
            .map(
              (post) => `
            <a class="blog-row" href="${post.href}">
              <time class="blog-date" datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
              <div>
                <h2 class="blog-row-title">${escapeHtml(post.title)}</h2>
                ${post.summary ? `<p class="blog-row-summary">${escapeHtml(post.summary)}</p>` : ''}
                ${
                  post.tags.length > 0
                    ? `<div class="chip-row">${post.tags
                        .map((t) => `<span class="chip">${escapeHtml(t)}</span>`)
                        .join('')}</div>`
                    : ''
                }
              </div>
            </a>`
            )
            .join('')}
        </div>`
      : `<div class="blog-empty">
          <p>这里暂时留白，等待写下第一篇随手记录。</p>
        </div>`;

  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">02 / BLOG</p>
      <h1 class="page-title">随手博客</h1>
      <p class="page-subtitle">零散的思考、技术备忘与日常记录。</p>
    </header>

    ${listHtml}
  `;

  return renderLayout({
    title: '随笔',
    description: 'JZWXZ 的随手博客与日常记录。',
    activeNav: 'blog',
    navTree,
    assetHashes,
    contentHtml,
  });
}

function buildBlogPostPage(post, navTree, assetHashes) {
  const tagsHtml = post.tags
    .map((t) => `<span class="chip chip--accent">${escapeHtml(t)}</span>`)
    .join('');

  const contentHtml = `
    <a class="back-link" href="/blog/">← 返回随笔列表</a>

    <header class="page-header">
      <p class="page-kicker">02 / ESSAY</p>
      <h1 class="page-title">${escapeHtml(post.title)}</h1>
      <div class="article-meta">
        <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
        <span>·</span>
        <span>约 ${post.readingMinutes} 分钟阅读</span>
        ${tagsHtml ? `<div class="chip-row">${tagsHtml}</div>` : ''}
      </div>
    </header>

    ${renderArticleToc(post.headings)}

    <article class="prose">
      ${post.html}
    </article>
  `;

  return renderLayout({
    title: post.title,
    description: post.summary || post.title,
    activeNav: 'blog',
    activeSlug: post.slug,
    navTree,
    assetHashes,
    contentHtml,
    includeKatex: true,
  });
}

function buildNotesIndexPage(notes, navTree, assetHashes) {
  const listHtml =
    notes.length > 0
      ? `<div class="collection-cards">
          ${notes
            .map((note) => {
              const badges = [];
              if (note.toolchain) badges.push(`<span class="chip chip--accent">${escapeHtml(note.toolchain)}</span>`);
              if (note.pages) badges.push(`<span class="chip">${note.pages} 页 PDF</span>`);
              for (const t of note.tags) badges.push(`<span class="chip">${escapeHtml(t)}</span>`);
              return `
                <a class="collection-card" href="${note.href}">
                  <div class="collection-card-top">
                    <div class="chip-row">${badges.join('')}</div>
                    ${note.date ? `<time class="collection-date" datetime="${escapeHtml(note.date)}">${escapeHtml(note.date)}</time>` : ''}
                  </div>
                  <h2 class="collection-card-title">${escapeHtml(note.title)}</h2>
                  ${note.summary ? `<p class="collection-card-summary">${escapeHtml(note.summary)}</p>` : ''}
                  <div class="collection-card-foot">
                    <span>${note.pdf ? '进入详情与 PDF 在线预览' : '阅读笔记全文'}</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </a>`;
            })
            .join('')}
        </div>`
      : `<div class="blog-empty"><p>学习笔记正在整理中。</p></div>`;

  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">03 / STUDY NOTES</p>
      <h1 class="page-title">学习笔记</h1>
      <p class="page-subtitle">比起零碎摘录，更想留下经得起反复翻看的成体系笔记。</p>
    </header>

    ${listHtml}
  `;

  return renderLayout({
    title: '学习笔记',
    description: 'JZWXZ 的学习笔记目录：抽象代数等数理与课程笔记。',
    activeNav: 'notes',
    navTree,
    assetHashes,
    contentHtml,
  });
}

function buildNoteDetailPage(note, navTree, assetHashes) {
  const metaChips = [];
  if (note.toolchain) metaChips.push(`<span class="chip chip--accent">${escapeHtml(note.toolchain)}</span>`);
  if (note.pages) {
    const label = note.version ? `${note.pages} 页 · ${note.version}` : `${note.pages} 页`;
    metaChips.push(`<span class="chip">${escapeHtml(label)}</span>`);
  }
  if (note.date) metaChips.push(`<span class="chip">更新于 ${escapeHtml(note.date)}</span>`);
  for (const t of note.tags) metaChips.push(`<span class="chip">${escapeHtml(t)}</span>`);

  const actionBtns = [];
  if (note.pdf) {
    actionBtns.push(
      `<a class="btn btn--primary" href="${note.pdf}" target="_blank" rel="noreferrer">新窗口阅读 PDF ↗</a>`
    );
    actionBtns.push(
      `<a class="btn" href="${note.pdf}" download="${escapeHtml(note.pdfFilename)}">下载 PDF ↓</a>`
    );
  }
  if (note.repo) {
    actionBtns.push(
      `<a class="btn${note.pdf ? '' : ' btn--primary'}" href="${escapeHtml(note.repo)}" target="_blank" rel="noreferrer">GitHub 仓库 ↗</a>`
    );
  }

  const chaptersHtml =
    note.chapters.length > 0
      ? `<section class="outline-block" aria-labelledby="outline-heading">
          <p class="section-label" id="outline-heading">TABLE OF CONTENTS · 章节导览</p>
          <div class="chapter-list">
            ${note.chapters
              .map((ch, idx) => {
                const status = ch.status || '';
                const chipCls =
                  status === '已整理'
                    ? 'chip chip--accent'
                    : status.startsWith('进行中')
                      ? 'chip chip--gold'
                      : 'chip';
                const openAttr = idx < 2 ? ' open' : '';
                return `
                  <details class="chapter-item"${openAttr}>
                    <summary class="chapter-summary">
                      <span class="chapter-title-wrap">
                        <span class="chapter-num">${escapeHtml(ch.number)}</span>
                        <span class="chapter-title">${escapeHtml(ch.title)}</span>
                      </span>
                      <span class="chapter-meta">
                        ${ch.pageRange ? `<span class="chapter-pages">${escapeHtml(ch.pageRange)}</span>` : ''}
                        ${status ? `<span class="${chipCls}">${escapeHtml(status)}</span>` : ''}
                      </span>
                    </summary>
                    ${
                      Array.isArray(ch.sections) && ch.sections.length > 0
                        ? `<ul class="chapter-sections">${ch.sections
                            .map((s) => `<li>${escapeHtml(s)}</li>`)
                            .join('')}</ul>`
                        : ''
                    }
                  </details>`;
              })
              .join('')}
          </div>
        </section>`
      : '';

  const pdfViewerHtml = note.pdf
    ? `<section class="pdf-block" aria-labelledby="pdf-preview-heading">
        <p class="section-label" id="pdf-preview-heading">ONLINE READER · PDF 在线预览</p>
        <div class="pdf-viewer-shell">
          <div class="pdf-toolbar">
            <span>${escapeHtml(note.pdfFilename)}${note.pages ? ` · ${note.pages} pages` : ''}</span>
            <a href="${note.pdf}" target="_blank" rel="noreferrer">全屏打开 ↗</a>
          </div>
          <iframe
            class="pdf-frame"
            src="${note.pdf}#view=FitH"
            title="${escapeHtml(note.title)} PDF 预览"
            loading="lazy"
          ></iframe>
          <div class="pdf-fallback-note">
            如果移动端浏览器未内置 PDF 预览器，可直接
            <a href="${note.pdf}" target="_blank" rel="noreferrer">打开原 PDF</a>
            或
            <a href="${note.pdf}" download="${escapeHtml(note.pdfFilename)}">下载到本地阅读</a>。
          </div>
        </div>
      </section>`
    : '';

  const contentHtml = `
    <a class="back-link" href="/notes/">← 返回笔记目录</a>

    <header class="page-header">
      <p class="page-kicker">03 / NOTE</p>
      <h1 class="page-title">${escapeHtml(note.title)}</h1>
      ${note.subtitle ? `<p class="page-subtitle">${escapeHtml(note.subtitle)}</p>` : ''}
    </header>

    <section class="note-hero-card">
      ${metaChips.length > 0 ? `<div class="note-hero-top"><div class="chip-row">${metaChips.join('')}</div></div>` : ''}
      ${note.reference ? `<p class="note-ref">${escapeHtml(note.reference)}</p>` : ''}
      ${note.summary ? `<p class="note-summary">${escapeHtml(note.summary)}</p>` : ''}
      ${actionBtns.length > 0 ? `<div class="btn-row">${actionBtns.join('')}</div>` : ''}
    </section>

    ${renderArticleToc(note.headings)}
    ${note.hasBody ? `<article class="prose note-body">${note.html}</article>` : ''}
    ${chaptersHtml}
    ${pdfViewerHtml}
  `;

  return renderLayout({
    title: note.title,
    description: note.summary || note.title,
    activeNav: 'notes',
    activeSlug: note.slug,
    navTree,
    assetHashes,
    contentHtml,
    includeKatex: true,
  });
}

function buildProjectsIndexPage(projects, navTree, assetHashes) {
  const listHtml =
    projects.length > 0
      ? `<div class="collection-cards">
          ${projects
            .map((proj) => {
              const badges = [];
              if (proj.status) badges.push(`<span class="chip chip--accent">${escapeHtml(proj.status)}</span>`);
              for (const t of proj.tags) badges.push(`<span class="chip">${escapeHtml(t)}</span>`);
              return `
                <a class="collection-card" href="${proj.href}">
                  <div class="collection-card-top">
                    <div class="chip-row">${badges.join('')}</div>
                    ${proj.date ? `<time class="collection-date" datetime="${escapeHtml(proj.date)}">${escapeHtml(proj.date)}</time>` : ''}
                  </div>
                  <h2 class="collection-card-title collection-card-title--mono">${escapeHtml(proj.title)}</h2>
                  ${proj.summary ? `<p class="collection-card-summary">${escapeHtml(proj.summary)}</p>` : ''}
                  <div class="collection-card-foot">
                    <span>查看项目详情与实现说明</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </a>`;
            })
            .join('')}
        </div>`
      : `<div class="blog-empty"><p>更多项目整理中。</p></div>`;

  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">04 / PROJECTS</p>
      <h1 class="page-title">项目介绍</h1>
      <p class="page-subtitle">记录从实际需求出发动手写出来、原理清晰可复现的作品。</p>
    </header>

    ${listHtml}
  `;

  return renderLayout({
    title: '项目介绍',
    description: 'JZWXZ 的个人项目目录与实现说明。',
    activeNav: 'projects',
    navTree,
    assetHashes,
    contentHtml,
  });
}

function buildProjectDetailPage(proj, navTree, assetHashes) {
  const stepsHtml =
    proj.steps.length > 0
      ? `<div class="workflow-steps" aria-label="核心执行流程">
          ${proj.steps
            .map(
              (step) => `
            <div class="workflow-step">
              <span class="workflow-step-num">${escapeHtml(step.num)}</span>
              <strong>${escapeHtml(step.title)}</strong>
              <span>${escapeHtml(step.desc)}</span>
            </div>`
            )
            .join('')}
        </div>`
      : '';

  const contentHtml = `
    <a class="back-link" href="/projects/">← 返回项目列表</a>

    <header class="page-header">
      <p class="page-kicker">04 / PROJECT</p>
      <h1 class="page-title">${escapeHtml(proj.title)}</h1>
      ${proj.subtitle ? `<p class="page-subtitle">${escapeHtml(proj.subtitle)}</p>` : ''}
    </header>

    <section class="project-banner">
      <div class="project-banner-head">
        <div class="chip-row">
          ${proj.status ? `<span class="chip chip--accent">${escapeHtml(proj.status)}</span>` : ''}
          ${proj.date ? `<span class="chip">${escapeHtml(proj.date)}</span>` : ''}
          ${proj.tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}
        </div>
        ${
          proj.github
            ? `<a class="btn btn--primary" href="${escapeHtml(proj.github)}" target="_blank" rel="noreferrer">查看 GitHub ↗</a>`
            : ''
        }
      </div>
      ${stepsHtml}
    </section>

    ${renderArticleToc(proj.headings)}
    ${proj.hasBody ? `<article class="prose">${proj.html}</article>` : ''}
  `;

  return renderLayout({
    title: proj.title,
    description: proj.summary || proj.subtitle || proj.title,
    activeNav: 'projects',
    activeSlug: proj.slug,
    navTree,
    assetHashes,
    contentHtml,
    includeKatex: true,
  });
}

function build404Page(navTree, assetHashes) {
  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">404 / LOST IN THE DARK WORLD</p>
      <h1 class="page-title">这里什么也没有</h1>
      <p class="page-subtitle">你访问的页面可能已经移动，或者还没有被写出来。</p>
    </header>
    <div class="btn-row">
      <a class="btn btn--primary" href="/">回到首页</a>
      <a class="btn" href="/notes/">去看学习笔记</a>
    </div>
  `;

  return renderLayout({
    title: '页面未找到',
    description: '404 - 页面未找到',
    activeNav: '',
    navTree,
    assetHashes,
    contentHtml,
  });
}

function buildLegacyRedirect(targetUrl) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${targetUrl}" />
    <title>Redirecting…</title>
  </head>
  <body>
    <p>Redirecting to <a href="${targetUrl}">${targetUrl}</a>…</p>
  </body>
</html>
`;
}

export async function build() {
  const start = Date.now();
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(path.join(DIST, 'assets'), { recursive: true });

  await copyDir(PUBLIC, DIST);
  const cssSrc = await fs.readFile(path.join(SRC, 'styles', 'main.css'));
  const jsSrc = await fs.readFile(path.join(SRC, 'scripts', 'site.js'));
  await fs.writeFile(path.join(DIST, 'assets', 'main.css'), cssSrc);
  await fs.writeFile(path.join(DIST, 'assets', 'site.js'), jsSrc);

  const assetHashes = {
    css: crypto.createHash('sha256').update(cssSrc).digest('hex').slice(0, 8),
    js: crypto.createHash('sha256').update(jsSrc).digest('hex').slice(0, 8),
  };

  const katexDist = path.join(ROOT, 'node_modules', 'katex', 'dist');
  const katexOut = path.join(DIST, 'assets', 'katex');
  await fs.mkdir(katexOut, { recursive: true });
  await fs.copyFile(path.join(katexDist, 'katex.min.css'), path.join(katexOut, 'katex.min.css'));
  await copyDir(path.join(katexDist, 'fonts'), path.join(katexOut, 'fonts'));

  const collections = {
    blog: await loadCollection('blog'),
    notes: await loadCollection('notes'),
    projects: await loadCollection('projects'),
  };
  const navTree = buildNavTree(collections);

  // Core pages
  await writeHtml('index.html', buildHomePage(collections, navTree, assetHashes));
  await writeHtml('about/index.html', await buildAboutPage(navTree, assetHashes));

  // Blog index + per-md detail pages
  await writeHtml('blog/index.html', buildBlogIndexPage(collections.blog, navTree, assetHashes));
  for (const post of collections.blog) {
    await writeHtml(`blog/${post.slug}/index.html`, buildBlogPostPage(post, navTree, assetHashes));
  }

  // Notes index + per-md detail pages
  await writeHtml('notes/index.html', buildNotesIndexPage(collections.notes, navTree, assetHashes));
  for (const note of collections.notes) {
    await writeHtml(`notes/${note.slug}/index.html`, buildNoteDetailPage(note, navTree, assetHashes));
  }

  // Projects index + per-md detail pages
  await writeHtml('projects/index.html', buildProjectsIndexPage(collections.projects, navTree, assetHashes));
  for (const proj of collections.projects) {
    await writeHtml(`projects/${proj.slug}/index.html`, buildProjectDetailPage(proj, navTree, assetHashes));
  }

  // 404 & legacy redirect
  await writeHtml('404.html', build404Page(navTree, assetHashes));
  await writeHtml('project-auto-vaulting.html', buildLegacyRedirect('/projects/auto_vaulting/'));

  const ms = Date.now() - start;
  console.log(
    `Built static site into dist/ (${collections.blog.length} blog, ${collections.notes.length} notes, ${collections.projects.length} projects) in ${ms}ms`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
