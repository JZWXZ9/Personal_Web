---
title: auto_vaulting
description: 基于 Carpet 假人的 Minecraft 试炼宝库自动开箱脚本。
date: 2026-09-02
category: 项目作品
featured: true
github: https://github.com/JZWXZ9/auto_vaulting
---

# auto_vaulting

## 项目简介

这个项目基于 Carpet Mod 提供的假人功能，通过 Python 脚本在 Minecraft 聊天栏自动输入指令，完成假人的批量生成、右键操作和退出，并通过聊天日志验证假人是否召唤或退出成功。

## 主要功能

- 在指定坐标自动生成假人；
- 执行右键操作；
- 操作完成后退出假人；
- 配置假人的初始值和循环轮次；
- 通过监控聊天日志验证执行结果。

脚本不是只按固定时间间隔连续发送指令，而是会读取日志最近的记录判断假人是否已经进入或退出。如果没有得到预期反馈，会等待后重试；退出后也会再次执行右键操作。

## 项目结构

- `config.py`：日志路径、坐标、朝向、名称前缀和时间控制等配置；
- `commands.py`：聊天命令发送、反馈监听和假人操作流程；
- `__init__.py`：程序入口、延迟和主循环控制。

## 使用技术

- Python；
- PyAutoGUI；
- Carpet Mod 假人功能；
- Minecraft 聊天日志监控。

## 项目说明

项目详情以 GitHub 仓库中的 README 和代码为准。当前作品集只整理已经确认的公开信息，不补写未经验证的性能数据或项目成果。
