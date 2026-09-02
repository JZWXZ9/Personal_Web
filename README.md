# JZWXZ 个人作品集 Demo

这是 `JZWXZ` 个人作品集网站的第一版本地原型。

## 当前 Demo 做了什么

- 首页、关于、项目、学习笔记、公开简历和联系方式；
- 以 `JZWXZ` 作为唯一公开身份；
- 不包含真实姓名、学号和手机号；
- 首要项目为 `JZWXZ9/auto_vaulting`；
- 学习笔记暂分为数学基础、课内课程、AI 论文阅读笔记和其他记录；
- 页面使用蓝色、优雅、偏技术作品集的视觉方向；
- CSS 和 JavaScript 中对关键结构添加了说明性注释。

## Astro 是什么

Astro 是一个静态网站生成工具。它可以把 Markdown 内容、页面组件、CSS 和 JavaScript 组合起来，生成可以直接访问的网页文件。

在这个个人网站中，Astro 未来主要负责：

1. 将 Markdown 文章转换成网页；
2. 自动生成项目详情页和文章详情页；
3. 管理文章标题、日期和分类等信息；
4. 在本地提供开发预览；
5. 构建出可部署到服务器的静态文件。

当前 Demo 先使用纯静态 HTML、CSS 和 JavaScript 完成视觉与交互验证，因此不需要等待前端依赖安装。后续确认页面方向后，再将这些内容迁移为 Astro 的 Markdown 内容结构。

## 本地预览

当前 Demo 已在本机启动，访问：

```text
http://localhost:4173/
```

如果需要手动重新启动，可以在本目录运行：

```text
python -m http.server 4173
```

## 文件说明

- `index.html`：作品集首页；
- `resume-public.html`：脱敏公开版简历页面；
- `styles.css`：全局视觉样式，按区域写有中文注释；
- `script.js`：移动端导航和滚动导航高亮；
- `简历.md`：不应直接发布的内部简历草稿位于上一级目录；
- `项目规划.md`：项目需求、模块和验收标准位于上一级目录。

## 后续迁移到 Markdown

计划将项目和文章整理为：

```text
src/content/projects/auto_vaulting.md
src/content/notes/mathematics/*.md
src/content/notes/courses/*.md
src/content/notes/ai-papers/*.md
src/content/notes/others/*.md
```

任何公开内容发布前，都需要再次检查是否包含真实姓名、学号、手机号或其他不必要的隐私信息。
