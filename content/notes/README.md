# 学习笔记目录说明

在 `content/notes/` 下新建任意 `.md` 文件（例如 `real-analysis.md`），提交推送到 `main` 分支后，会自动生成：
- 独立笔记详情页 `/notes/<文件名>/`
- 笔记总览列表 `/notes/` 中的条目
- 左侧边栏「03 笔记」下的二级索引

## 方式一：纯 Markdown + KaTeX 笔记

```markdown
---
title: 数学分析笔记
shortTitle: 数学分析
date: 2026-12-01
summary: 一句话概述这份笔记的内容。
tags:
  - 数学分析
draft: false
---

这里直接写 Markdown 与 `$...$` / `$$...$$` 数学公式。
```

## 方式二：附带 PDF 在线预览与章节目录的笔记

在 frontmatter 中额外提供 `pdf`（放到 `public/assets/notes/` 下）、`repo`、`toolchain`、`pages`、`chapters` 字段即可自动渲染 PDF 阅读器与折叠目录（参考 `abstract-algebra.md`）。
