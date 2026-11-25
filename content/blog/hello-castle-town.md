---
title: Hello, Castle Town
date: 2026-11-24
category: daily-life
summary: 博客重做后的第一条留档，顺便测试 Markdown、代码高亮与 KaTeX 数学公式渲染。
tags:
  - 随笔
  - 建站
---

把旧版那套滚屏式的页面推倒重来，换成现在这个**侧边栏索引 + 纸墨简约风**的版本。

以后这里会用来放一些不成体系的随手记录：读到的想法、踩过的坑、偶尔想写下来的短文。目前文章还不多，先留这一篇作为占位和排版参考。

## 数学公式预览

既然平时也会记数学笔记，随笔里自然少不了公式。行内公式直接用 `$...$` 包裹，比如群同态基本定理写作 $G / \ker \varphi \cong \operatorname{im} \varphi$，有限群中任意子群 $H \le G$ 满足 Lagrange 定理：

$$
|G| = [G : H] \cdot |H|
$$

以及元素的阶与幂次关系：若 $|a| = n$，则对任意整数 $k$，

$$
\left|a^k\right| = \frac{n}{\gcd(k, n)}.
$$

## 代码块预览

```python
def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return abs(a)
```

> 写新文章只需要在 `content/blog/` 目录下新建一个 `.md` 文件，填好顶部的 `title`、`date`、`summary`、`tags`，提交推送到 `main` 分支后，GitHub Actions 会自动编译并同步到 `blog.jzwxz9.space`。
