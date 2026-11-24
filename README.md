# JZWXZ Personal Blog (`blog.jzwxz9.space`)

侧边栏索引驱动的极简个人博客与学习归档站点，采用纸墨简约风 + 城堡镇（Deltarune）暗色双主题。

## 站点结构

- `/` — 主页欢迎界面（含 Castle Town + Ralsei 像素微缩场景）
- `/about/` — 个人简介（由 `content/pages/about.md` 生成）
- `/blog/` — 随手博客（由 `content/blog/*.md` 自动构建，支持 KaTeX 公式与代码高亮）
- `/notes/` — 学习笔记（主打 `JZWXZ9/Abstract-Algebra`，支持站内 PDF 预览与下载）
- `/projects/` — 项目介绍（聚焦 `JZWXZ9/auto_vaulting`）

## 日常写博客

在 `content/blog/` 下新增 `.md` 文件并推送到 `main` 分支即可，GitHub Actions 会自动执行 `npm run build` 并将 `dist/` 同步至服务器。详见 `content/blog/README.md`。

## 本地开发与构建

```bash
npm install
npm run dev      # 本地预览 http://localhost:4173
npm run build    # 生成纯静态文件到 dist/
```

## 隐私原则

公开内容仅使用 `JZWXZ` 身份，不包含真实姓名、学号、手机号或服务器私密配置。
