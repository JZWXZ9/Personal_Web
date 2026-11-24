# JZWXZ Personal Blog (`blog.jzwxz9.space`)

侧边栏索引驱动的极简个人博客与学习归档站点，采用纸墨简约风 + 城堡镇（Deltarune）暗色双主题。

## 站点结构与独立 Markdown 管理

- `/` — 主页欢迎界面
- `/about/` — 个人简介（`content/pages/about.md`）
- `/blog/` 与 `/blog/<slug>/` — 随手博客（`content/blog/*.md`，自动生成列表页、详情页与左侧二级索引）
- `/notes/` 与 `/notes/<slug>/` — 学习笔记（`content/notes/*.md`，支持纯 Markdown+KaTeX 或内嵌 PDF 预览）
- `/projects/` 与 `/projects/<slug>/` — 项目介绍（`content/projects/*.md`，自动生成项目卡片、详情页与左侧二级索引）

## 日常新增内容

直接往对应目录（`content/blog/`、`content/notes/`、`content/projects/`）新增 `.md` 文件并推送到 `main` 分支即可，GitHub Actions 会自动执行 `npm run build` 并将 `dist/` 同步至服务器。各目录内均有 `README.md` 模板说明。

## 本地开发与构建

```bash
npm install
npm run dev      # 本地预览 http://localhost:4173
npm run build    # 生成纯静态文件到 dist/
```

## 隐私原则

公开内容仅使用 `JZWXZ` 身份，不包含真实姓名、学号、手机号或服务器私密配置。
