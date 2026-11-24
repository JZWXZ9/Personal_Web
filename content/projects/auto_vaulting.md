---
title: auto_vaulting
subtitle: 基于 Carpet 假人与日志校验的 Minecraft 1.21+ 试炼宝库自动开箱脚本
date: 2026-09
status: 持续完善中
github: https://github.com/JZWXZ9/auto_vaulting
tags:
  - Python 3.13
  - PyAutoGUI
  - Carpet Mod
  - Minecraft 1.21+
---

## 项目背景

Minecraft 1.21 引入的 **试炼宝库**（Trial Vault）让附魔金苹果、钻石、沉重核心等稀缺物品实现了可再生，但机制上每名玩家只能开启同一个宝库一次。

不过，宝库内部对已开启玩家的记录存在容量上限（仅记录最近开启过的 **128 名玩家**）。结合 Carpet Mod 提供的 `/player` 假人功能，通过脚本轮换生成不同编号的假人，便可以实现稳定、自动化的无限开箱循环。

## 核心工作流

相比单纯依赖固定 `sleep` 盲发指令的脚本，`auto_vaulting` 引入了**聊天日志状态验证机制**，避免服务器延迟或卡顿导致的指令错位：

1. **生成假人**：按配置的坐标（`position`）、朝向（`facing`）与命名规则在指定位置召唤编号假人。
2. **日志确认进入**：读取 Minecraft `latest.log` 的最新记录，确认假人已成功上线；若未收到预期反馈，则等待并重试。
3. **执行右键交互**：通过聊天栏指令控制假人右键开启试炼宝库。
4. **退出清理与复核**：发送退出指令清理当前假人并校验退出日志，确认完成后继续下一轮循环（默认一轮最多 144 个假人，覆盖 128 记录上限）。

## 代码结构

| 文件 | 职责说明 |
| :--- | :--- |
| `config.py` | 集中管理 `latest.log` 路径、假人坐标与朝向（支持游戏内 `F3 + C` 快速获取）、前缀与名称模板、时间间隔及单轮最大假人数量（默认 `144`）。 |
| `commands.py` | 封装聊天命令发送、监听日志反馈的重试装饰器、假人召唤 / 右键 / 退出逻辑与主循环控制。 |
| `__init__.py` | 程序入口，提供 5 秒窗口切换缓冲，读取起始编号与目标轮次后启动自动流程。 |

## 运行环境与配置要点

- **环境要求**：Python 3.13、`PyAutoGUI 0.9.54`，游戏端需加载 Carpet Mod 并允许聊天命令。
- **自定义配置**：在 `config.py` 中修改 `file_path`（版本隔离环境位于 `.minecraft/versions/<版本>/logs/latest.log`）、`position`、`facing`、`__prefix`（若服务器启用了 `Carpet fakePlayerNameSuffix`）与 `changed_time`。
- **使用提示**：运行 `__init__.py` 后在 5 秒内切回 Minecraft 窗口，运行期间不要手动移动键鼠以免干扰自动化输入。
