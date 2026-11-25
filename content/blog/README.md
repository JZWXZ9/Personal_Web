# 随手博客写作与分类目录指南

随手博客由两部分独立 Markdown 构成：

1. **分类目录页**：`content/blog/categories/*.md`
   - 左侧边栏「02 随笔」展开后直接显示这里的所有分类（按 `order` 排序）。
   - 每个分类 `.md` 文件本身就是一张目录页，你可以直接在正文中手写每一篇随笔的链接和介绍，例如：
     ```markdown
     - [文章标题](/blog/my-post/) — 一句话简介。
     ```
   - 新增或修改分类只需在 `content/blog/categories/` 中增删 `.md` 文件。

2. **单篇随笔正文**：`content/blog/*.md`
   - 每篇随笔是一个独立的 `.md` 文件，生成路径为 `/blog/<文件名>/`。
   - Frontmatter 模板：
     ```markdown
     ---
     title: 文章标题
     date: 2026-11-25
     category: daily-life   # 对应 categories/<文件名>，用于文章顶部返回链接与侧边栏高亮
     summary: 一句话摘要。
     tags:
       - 随笔
     draft: false
     ---
     ```
   - 如果你在文章里填写了 `category`，且没有在对应分类 `.md` 正文中手动列出它的链接，构建脚本也会自动在分类页下方补充该分类的文章列表（已手动列出的不会重复出现）。
