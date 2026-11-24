---
title: 抽象代数学习笔记
shortTitle: 抽象代数
subtitle: 基本概念与群论 · ElegantBook 中文排版
date: 2026-11-14
summary: 以课程课件为主、参考杨子胥《近世代数（第二版）》整理的 ElegantBook 笔记，含完整定义、定理、证明与个人批注，支持站内 PDF 在线预览与下载。
repo: https://github.com/JZWXZ9/Abstract-Algebra
pdf: /assets/notes/abstract-algebra.pdf
pdfFilename: abstract-algebra.pdf
version: 第一版
pages: 19
toolchain: XeLaTeX · ElegantBook
reference: 以课程课件为主，参考杨子胥《近世代数（第二版）》
tags:
  - 抽象代数
  - 群论
  - LaTeX
chapters:
  - number: 第一章
    title: 基本概念
    status: 已整理
    pageRange: P.1 – P.8
    sections:
      - 1.1 集合
      - 1.2 映射与变换
      - 1.3 代数运算
      - 1.4 运算律
      - 1.5 同态与同构
      - 1.6 等价关系与集合的分类
  - number: 第二章
    title: 群
    status: 进行中（2.1–2.3 已成稿）
    pageRange: P.9 – P.16
    sections:
      - 2.1 群的定义和初步性质
      - 2.2 群中元素的阶
      - 2.3 子群
      - 2.4 循环群（目录框架）
      - 2.5 变换群（目录框架）
      - 2.6 置换群（目录框架）
      - 2.7 陪集、指数和 Lagrange 定理（目录框架）
  - number: 第三章
    title: 正规子群和群的同态与同构
    status: 目录框架
    pageRange: P.17
    sections:
      - 3.1 群同态与同构的简单性质
      - 3.2 正规子群和商群
      - 3.3 群同态基本定理
      - 3.4 群的同构定理
      - 3.5 群的自同构群
      - 3.6 共轭关系与正规化子
      - 3.7 群的直积
      - 3.8 Sylow 定理
      - 3.9 有限交换群
---

## 笔记特点

- 严谨补全定义、定理与推导细节，特别标注**良定义性**、**封闭性**等在证明中容易忽略的环节。
- 在课程内容之外补充个人独立证明思路与拓展结论，例如有限半群成群的映射视角证明，以及互素阶元素幂交集引理（若 $\gcd(|a|, |b|) = 1$，则 $\langle a \rangle \cap \langle b \rangle = \{e\}$）。
- 基于 ElegantBook 模板使用 XeLaTeX 编译，结构清晰，适合系统梳理与考前复盘。
