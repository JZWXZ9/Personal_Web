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

const NAV_ITEMS = [
  { id: 'home', index: '00', label: '首页', en: 'Home', href: '/' },
  { id: 'about', index: '01', label: '简介', en: 'About', href: '/about/' },
  { id: 'blog', index: '02', label: '随笔', en: 'Blog', href: '/blog/' },
  { id: 'notes', index: '03', label: '笔记', en: 'Notes', href: '/notes/' },
  { id: 'projects', index: '04', label: '项目', en: 'Projects', href: '/projects/' },
];

// Configure marked with highlight.js static code highlighting
const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : null;
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : escapeHtml(text);
      const cls = language ? ` class="hljs language-${escapeHtml(language)}"` : ' class="hljs"';
      return `<pre><code${cls}>${highlighted}</code></pre>\n`;
    },
  },
});

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Render Markdown with KaTeX math ($...$ and $$...$$) safely isolated from
 * code fences, inline code spans, and Markdown underscore/asterisk parsing.
 */
function renderMarkdown(rawMarkdown) {
  const codePlaceholders = [];
  const mathPlaceholders = [];

  // 1. Protect fenced code blocks and inline code spans
  let text = rawMarkdown.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    const token = `@@CODE_BLOCK_${codePlaceholders.length}@@`;
    codePlaceholders.push(match);
    return token;
  });

  // 2. Render display math $$...$$
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

  // 3. Render inline math $...$ (avoid escaped \$ and multiline mismatches)
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

  // 4. Restore code blocks before marked parses Markdown
  text = text.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, idx) => codePlaceholders[Number(idx)]);

  // 5. Parse Markdown
  let html = marked.parse(text);

  // 6. Restore rendered KaTeX HTML
  html = html.replace(/<p>@@MATH_BLOCK_(\d+)@@<\/p>/g, (_, idx) => mathPlaceholders[Number(idx)]);
  html = html.replace(/@@MATH_(?:BLOCK|INLINE)_(\d+)@@/g, (_, idx) => mathPlaceholders[Number(idx)]);

  return html;
}

function formatDate(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().slice(0, 10);
  }
  return String(dateVal).slice(0, 10);
}

function estimateReadingMinutes(markdownText) {
  const plain = markdownText.replace(/```[\s\S]*?```/g, '').replace(/[#>*`_\-$]/g, '');
  const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (plain.replace(/[\u4e00-\u9fff]/g, ' ').match(/\b\w+\b/g) || []).length;
  return Math.max(1, Math.ceil((cjk + words * 1.5) / 360));
}

function renderLayout({ title, description, activeNav, contentHtml, includeKatex = false }) {
  const fullTitle = activeNav === 'home' ? `${SITE.brand} · 个人博客` : `${title} · ${SITE.brand}`;
  const navHtml = NAV_ITEMS.map((item) => {
    const activeClass = item.id === activeNav ? ' is-active' : '';
    const ariaCurrent = item.id === activeNav ? ' aria-current="page"' : '';
    return `
      <a class="nav-item${activeClass}" href="${item.href}"${ariaCurrent}>
        <span class="nav-index">${item.index}</span>
        <span>${item.label}</span>
        <span class="nav-en">${item.en}</span>
      </a>`;
  }).join('');

  const katexLink = includeKatex
    ? `<link rel="stylesheet" href="/assets/katex/katex.min.css" />`
    : '';

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(fullTitle)}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    ${katexLink}
    <link rel="stylesheet" href="/assets/main.css" />
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

        <div class="ralsei-card" aria-label="Deltarune 彩蛋">
          <p class="ralsei-speech" id="ralsei-sidebar-speech">Welcome to Castle Town. Take your time reading.</p>
          <button
            type="button"
            class="ralsei-trigger"
            id="ralsei-sidebar-btn"
            title="点击切换 Ralsei 版本（Ch.1 / Ch.2）"
          >
            <span class="ralsei-sprite-wrap">
              <img
                id="ralsei-sidebar-img"
                class="ralsei-sprite pixel-art"
                src="/assets/deltarune/ralsei-ch2.png"
                alt="Ralsei pixel sprite"
              />
            </span>
            <span class="ralsei-meta">
              <span class="ralsei-name">
                Ralsei
                <span class="ralsei-badge" id="ralsei-sidebar-badge">Ch.2</span>
              </span>
              <span class="ralsei-hint">点我切换装扮</span>
            </span>
          </button>
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

    <script src="/assets/site.js" defer></script>
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

async function loadBlogPosts() {
  const blogDir = path.join(CONTENT, 'blog');
  let files = [];
  try {
    files = await fs.readdir(blogDir);
  } catch {
    return [];
  }

  const posts = [];
  for (const file of files) {
    if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
    const raw = await fs.readFile(path.join(blogDir, file), 'utf-8');
    const { data, content } = matter(raw);
    if (data.draft === true) continue;

    const slug = file.replace(/\.md$/i, '');
    posts.push({
      slug,
      title: data.title || slug,
      date: formatDate(data.date),
      summary: data.summary || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      readingMinutes: estimateReadingMinutes(content),
      html: renderMarkdown(content),
    });
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts;
}

function buildHomePage(posts, notesData) {
  const latestPost = posts[0];
  const blogSummary = latestPost
    ? `最新：《${escapeHtml(latestPost.title)}》（${latestPost.date}），共 ${posts.length} 篇。`
    : '还没有写下第一篇随笔，支持 Markdown 与数学公式，随时落笔。';

  const contentHtml = `
    <section class="welcome-hero">
      <p class="page-kicker">CASTLE TOWN · WELCOME</p>
      <h1 class="page-title">你好，这里是 JZWXZ。</h1>
      <p class="welcome-lead">
        一个安静的个人角落，用来收放随手写下的短文、认真排版过的数学学习笔记，以及自己动手做的小项目。从左侧目录随时切换，不必一路往下翻。
      </p>
    </section>

    <figure class="castle-diorama" aria-label="Deltarune 城堡镇微缩像素场景">
      <div class="diorama-stage">
        <div class="diorama-stars" aria-hidden="true"></div>
        <div class="diorama-fountain-glow" aria-hidden="true"></div>
        <img class="diorama-fountain pixel-art" src="/assets/deltarune/castle-fountain.png" alt="" aria-hidden="true" />
        <img class="diorama-house-left pixel-art" src="/assets/deltarune/castle-house.png" alt="" aria-hidden="true" />
        <img class="diorama-torch-left pixel-art" src="/assets/deltarune/castle-torch.png" alt="" aria-hidden="true" />
        <img class="diorama-book pixel-art" src="/assets/deltarune/castle-book-pillar.png" alt="" aria-hidden="true" />
        <img class="diorama-cafe pixel-art" src="/assets/deltarune/castle-cafe.png" alt="" aria-hidden="true" />

        <button
          type="button"
          class="diorama-ralsei-btn"
          id="diorama-ralsei-btn"
          title="点击和 Ralsei 打招呼"
        >
          <img
            id="diorama-ralsei-img"
            class="diorama-ralsei pixel-art"
            src="/assets/deltarune/ralsei-ch2.png"
            alt="Ralsei in Castle Town"
          />
        </button>

        <button
          type="button"
          class="diorama-savepoint-btn"
          id="diorama-savepoint-btn"
          title="点击存档点"
        >
          <img
            class="diorama-savepoint pixel-art"
            src="/assets/deltarune/savepoint.png"
            alt="Castle Town Save Point"
          />
        </button>

        <div class="diorama-ground" aria-hidden="true"></div>
      </div>

      <figcaption class="diorama-bar">
        <p class="diorama-dialogue" id="diorama-dialogue">Welcome to Castle Town. Click the star to save your visit.</p>
        <span class="diorama-tag">CASTLE TOWN ★</span>
      </figcaption>
    </figure>

    <section aria-labelledby="home-index-label">
      <p class="section-label" id="home-index-label">INDEX · 站点目录</p>
      <div class="index-grid">
        <a class="index-card" href="/blog/">
          <div class="index-card-top">
            <span>02 / BLOG</span>
            <span>MD + KaTeX</span>
          </div>
          <h2>随手博客</h2>
          <p>${blogSummary}</p>
          <div class="index-card-foot">
            <span>进入随笔</span>
            <span aria-hidden="true">→</span>
          </div>
        </a>

        <a class="index-card" href="/notes/">
          <div class="index-card-top">
            <span>03 / NOTES</span>
            <span>${notesData.featured.pages} PAGES PDF</span>
          </div>
          <h2>${escapeHtml(notesData.featured.title)}</h2>
          <p>以课程课件与杨子胥《近世代数》整理而成的 ElegantBook 笔记，支持站内在线翻阅与下载。</p>
          <div class="index-card-foot">
            <span>阅读笔记</span>
            <span aria-hidden="true">→</span>
          </div>
        </a>

        <a class="index-card" href="/projects/">
          <div class="index-card-top">
            <span>04 / PROJECT</span>
            <span>PYTHON</span>
          </div>
          <h2>auto_vaulting</h2>
          <p>基于 Carpet 假人与聊天日志状态校验的 Minecraft 1.21+ 试炼宝库自动开箱脚本。</p>
          <div class="index-card-foot">
            <span>查看项目</span>
            <span aria-hidden="true">→</span>
          </div>
        </a>
      </div>
    </section>
  `;

  return renderLayout({
    title: '首页',
    description: 'JZWXZ 的个人博客：随手博客、抽象代数学习笔记与个人项目。',
    activeNav: 'home',
    contentHtml,
  });
}

async function buildAboutPage() {
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
    contentHtml,
  });
}

function buildBlogIndexPage(posts) {
  const listHtml =
    posts.length > 0
      ? `<div class="blog-list">
          ${posts
            .map(
              (post) => `
            <a class="blog-row" href="/blog/${encodeURIComponent(post.slug)}/">
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
      <p class="page-subtitle">零散的思考、技术备忘与日常记录。所有文章均由 Markdown 文件静态生成。</p>
    </header>

    ${listHtml}

    <div class="blog-tip">
      写作方式：在仓库 <code>content/blog/</code> 下新增 <code>.md</code> 文件（支持代码高亮与 <code>$...$</code> / <code>$$...$$</code> KaTeX 数学公式），推送到 <code>main</code> 后即自动发布。
    </div>
  `;

  return renderLayout({
    title: '随笔',
    description: 'JZWXZ 的随手博客与日常记录。',
    activeNav: 'blog',
    contentHtml,
  });
}

function buildBlogPostPage(post) {
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

    <article class="prose">
      ${post.html}
    </article>
  `;

  return renderLayout({
    title: post.title,
    description: post.summary || post.title,
    activeNav: 'blog',
    contentHtml,
    includeKatex: true,
  });
}

function buildNotesPage(notesData) {
  const note = notesData.featured;

  const chaptersHtml = note.chapters
    .map((ch, idx) => {
      const chipCls =
        ch.status === '已整理'
          ? 'chip chip--accent'
          : ch.status.startsWith('进行中')
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
              <span class="chapter-pages">${escapeHtml(ch.pageRange)}</span>
              <span class="${chipCls}">${escapeHtml(ch.status)}</span>
            </span>
          </summary>
          <ul class="chapter-sections">
            ${ch.sections.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </details>`;
    })
    .join('');

  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">03 / STUDY NOTES</p>
      <h1 class="page-title">学习笔记</h1>
      <p class="page-subtitle">比起零碎摘录，更想留下经得起反复翻看的成体系笔记。目前重点展示抽象代数学习笔记。</p>
    </header>

    <section class="note-hero-card">
      <div class="note-hero-top">
        <div class="chip-row">
          <span class="chip chip--accent">${escapeHtml(note.toolchain)}</span>
          <span class="chip">${note.pages} 页 · ${escapeHtml(note.version)}</span>
          <span class="chip">更新于 ${escapeHtml(note.updated)}</span>
        </div>
      </div>

      <h2>${escapeHtml(note.title)}</h2>
      <p class="note-ref">${escapeHtml(note.reference)}</p>
      <p class="note-summary">${escapeHtml(note.summary)}</p>

      <ul class="note-highlights">
        ${note.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}
      </ul>

      <div class="btn-row">
        <a class="btn btn--primary" href="${note.pdfPath}" target="_blank" rel="noreferrer">
          新窗口阅读 PDF ↗
        </a>
        <a class="btn" href="${note.pdfPath}" download="${escapeHtml(note.pdfFilename)}">
          下载 PDF ↓
        </a>
        <a class="btn" href="${note.repo}" target="_blank" rel="noreferrer">
          GitHub 仓库 ↗
        </a>
      </div>
    </section>

    <section class="outline-block" aria-labelledby="outline-heading">
      <p class="section-label" id="outline-heading">TABLE OF CONTENTS · 章节导览</p>
      <div class="chapter-list">
        ${chaptersHtml}
      </div>
    </section>

    <section aria-labelledby="pdf-preview-heading">
      <p class="section-label" id="pdf-preview-heading">ONLINE READER · PDF 在线预览</p>
      <div class="pdf-viewer-shell">
        <div class="pdf-toolbar">
          <span>${escapeHtml(note.pdfFilename)} · ${note.pages} pages</span>
          <a href="${note.pdfPath}" target="_blank" rel="noreferrer">全屏打开 ↗</a>
        </div>
        <iframe
          class="pdf-frame"
          src="${note.pdfPath}#view=FitH"
          title="${escapeHtml(note.title)} PDF 预览"
          loading="lazy"
        ></iframe>
        <div class="pdf-fallback-note">
          如果移动端浏览器未内置 PDF 预览器，可直接
          <a href="${note.pdfPath}" target="_blank" rel="noreferrer">打开原 PDF</a>
          或
          <a href="${note.pdfPath}" download="${escapeHtml(note.pdfFilename)}">下载到本地阅读</a>。
        </div>
      </div>
    </section>
  `;

  return renderLayout({
    title: '学习笔记',
    description: 'JZWXZ 的抽象代数学习笔记（Abstract Algebra）：完整章节导览与 ElegantBook PDF 在线预览。',
    activeNav: 'notes',
    contentHtml,
  });
}

async function buildProjectsPage() {
  const raw = await fs.readFile(path.join(CONTENT, 'projects', 'auto_vaulting.md'), 'utf-8');
  const { data, content } = matter(raw);
  const bodyHtml = renderMarkdown(content);
  const tags = Array.isArray(data.tags) ? data.tags : [];

  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">04 / PROJECTS</p>
      <h1 class="page-title">项目介绍</h1>
      <p class="page-subtitle">记录自己从实际需求出发动手写出来、并且代码与原理都清晰可复现的作品。</p>
    </header>

    <section class="project-banner">
      <div class="project-banner-head">
        <div>
          <h2>${escapeHtml(data.title || 'auto_vaulting')}</h2>
          <p>${escapeHtml(data.subtitle || '')}</p>
        </div>
        <a class="btn btn--primary" href="${escapeHtml(data.github || SITE.githubUrl)}" target="_blank" rel="noreferrer">
          查看 GitHub ↗
        </a>
      </div>

      <div class="chip-row">
        <span class="chip chip--accent">${escapeHtml(data.status || '维护中')}</span>
        ${tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}
      </div>

      <div class="workflow-steps" aria-label="核心执行流程">
        <div class="workflow-step">
          <span class="workflow-step-num">STEP 01</span>
          <strong>召唤假人</strong>
          <span>按坐标、朝向与编号通过聊天栏召唤 Carpet 假人</span>
        </div>
        <div class="workflow-step">
          <span class="workflow-step-num">STEP 02</span>
          <strong>日志校验上线</strong>
          <span>读取 latest.log 确认假人进入，异常自动等待重试</span>
        </div>
        <div class="workflow-step">
          <span class="workflow-step-num">STEP 03</span>
          <strong>右键开箱</strong>
          <span>自动发送右键交互指令开启试炼宝库</span>
        </div>
        <div class="workflow-step">
          <span class="workflow-step-num">STEP 04</span>
          <strong>退出并复核</strong>
          <span>清理假人并校验退出日志后推进下一轮循环</span>
        </div>
      </div>
    </section>

    <article class="prose">
      ${bodyHtml}
    </article>
  `;

  return renderLayout({
    title: '项目介绍',
    description: 'JZWXZ 的项目作品：auto_vaulting（Minecraft 1.21+ 试炼宝库自动开箱脚本）。',
    activeNav: 'projects',
    contentHtml,
  });
}

function build404Page() {
  const contentHtml = `
    <header class="page-header">
      <p class="page-kicker">404 / LOST IN THE DARK WORLD</p>
      <h1 class="page-title">这里什么也没有</h1>
      <p class="page-subtitle">你访问的页面可能已经移动，或者还没有被写出来。</p>
    </header>
    <div class="btn-row">
      <a class="btn btn--primary" href="/">回到首页（Castle Town）</a>
      <a class="btn" href="/notes/">去看抽象代数笔记</a>
    </div>
  `;

  return renderLayout({
    title: '页面未找到',
    description: '404 - 页面未找到',
    activeNav: '',
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

  // 1. Copy public static assets (deltarune sprites, abstract-algebra.pdf, favicon.svg, etc.)
  await copyDir(PUBLIC, DIST);

  // 2. Copy site CSS & JS
  await fs.copyFile(path.join(SRC, 'styles', 'main.css'), path.join(DIST, 'assets', 'main.css'));
  await fs.copyFile(path.join(SRC, 'scripts', 'site.js'), path.join(DIST, 'assets', 'site.js'));

  // 3. Copy local KaTeX CSS & fonts (zero external CDN dependency!)
  const katexDist = path.join(ROOT, 'node_modules', 'katex', 'dist');
  const katexOut = path.join(DIST, 'assets', 'katex');
  await fs.mkdir(katexOut, { recursive: true });
  await fs.copyFile(path.join(katexDist, 'katex.min.css'), path.join(katexOut, 'katex.min.css'));
  await copyDir(path.join(katexDist, 'fonts'), path.join(katexOut, 'fonts'));

  // 4. Load content
  const posts = await loadBlogPosts();
  const notesData = JSON.parse(
    await fs.readFile(path.join(CONTENT, 'notes', 'abstract-algebra.json'), 'utf-8')
  );

  // 5. Render all static pages
  await writeHtml('index.html', buildHomePage(posts, notesData));
  await writeHtml('about/index.html', await buildAboutPage());
  await writeHtml('blog/index.html', buildBlogIndexPage(posts));
  for (const post of posts) {
    await writeHtml(`blog/${post.slug}/index.html`, buildBlogPostPage(post));
  }
  await writeHtml('notes/index.html', buildNotesPage(notesData));
  await writeHtml('projects/index.html', await buildProjectsPage());
  await writeHtml('404.html', build404Page());
  await writeHtml('project-auto-vaulting.html', buildLegacyRedirect('/projects/'));

  const ms = Date.now() - start;
  console.log(`Built static site into dist/ (${posts.length} blog post(s)) in ${ms}ms`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
