# 项目目录说明

在 `content/projects/` 下新建任意 `.md` 文件（例如 `my-tool.md`），提交推送到 `main` 分支后，会自动生成：
- 独立项目详情页 `/projects/<文件名>/`
- 项目总览列表 `/projects/` 中的条目
- 左侧边栏「04 项目」下的二级索引

## Frontmatter 模板

```markdown
---
title: 项目名称
shortTitle: 侧边栏短标题（可选）
subtitle: 一句话定位
summary: 显示在项目列表页的简介。
date: 2026-12-01
status: 维护中
github: https://github.com/JZWXZ9/your-repo
tags:
  - Python
draft: false
---

这里写项目介绍、架构说明与使用方法，支持 Markdown 表格、代码高亮与 KaTeX 公式。
```
