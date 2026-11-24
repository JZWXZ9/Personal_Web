# 随手博客写作指南

在 `content/blog/` 目录下新建任意英文或拼音命名的 `.md` 文件（例如 `2026-12-notes.md`），提交并推送到 `main` 分支，GitHub Actions 就会自动构建并发布到 `blog.jzwxz9.space/blog/`。

## Frontmatter 模板

```markdown
---
title: 文章标题
date: 2026-11-25
summary: 一句话摘要，会显示在博客列表页。
tags:
  - 随笔
  - 思考
draft: false
---

这里开始写正文。支持标准 Markdown、代码块、行内公式 `$E = mc^2$` 与块级公式 `$$...$$`。
```

- 将 `draft: true` 时，该文章不会出现在正式站点中，适合写草稿。
- 若想清空示例占位文章，直接删除 `hello-castle-town.md` 即可，博客列表页会自动展示极简空态。
