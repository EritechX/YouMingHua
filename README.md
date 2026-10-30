# 又茗花

为 Codex / ChatGPT 桌面端制作的淡粉色主题工具，内置又茗花背景、明暗配色和界面兼容补丁，支持跟随系统切换外观。

基于 [Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin) v1.5.21，定制版版本为 **1.0.0**。沿用上游 MIT 许可及版权声明，非 OpenAI 官方产品。上游说明见 [README.upstream.md](README.upstream.md)。

## 下载

| 平台 | 系统要求 | 下载 v1.0.0 测试版 |
| --- | --- | --- |
| macOS | macOS 13 或更新版本，Apple Silicon / Intel | [下载安装包（DMG）](https://github.com/EritechX/YouMingHua/releases/download/v1.0.0/YouMingHua-v1.0.0.dmg) |
| Windows | Windows 10 / 11，x64 | [下载安装包（EXE）](https://github.com/EritechX/YouMingHua/releases/download/v1.0.0/YouMingHua-Setup-v1.0.0.exe) |

[版本说明与全部文件](https://github.com/EritechX/YouMingHua/releases/tag/v1.0.0) · [SHA-256 校验文件](https://github.com/EritechX/YouMingHua/releases/download/v1.0.0/SHA256SUMS.txt)

安装包保存在 Releases，不受 Actions 构建产物的 3 天保留期限影响。

安装包已内置主题和所需资源，**无需下载源码、安装开发工具或额外导入主题 ZIP**。GitHub 的「Code → Download ZIP」下载的是源码，不是安装包。

Windows 包已通过 GitHub Actions 构建和自动测试，macOS 包已通过本地构建与静态检查；两端的新电脑首次安装、Windows 真实客户端显示效果仍待试用确认。

## 安装前

1. 安装官方 Codex / ChatGPT 桌面应用，正常启动一次。
2. 保存正在进行的工作，完全退出官方客户端。
3. 如果正在使用原版 Dream Skin，先停止其皮肤并退出。同一个官方客户端只运行一套换肤工具。

## macOS 安装

1. 打开 `YouMingHua-v1.0.0.dmg`，将「又茗花.app」拖到 **Applications（应用程序）**。
2. 从「应用程序」打开「又茗花」。本测试包未经过 Apple 公证；若提示无法验证开发者，确认文件来源后，在 **系统设置 → 隐私与安全性 → 仍要打开** 中确认。
3. 在屏幕顶部菜单栏找到又茗花图标，按提示完成引擎安装。若提示缺少引擎，选择 **安装 / 升级引擎…**。
4. 选择 **应用皮肤**，按提示启动官方客户端。
5. 在官方应用的外观设置中选择 **系统 / 跟随系统**，即可自动切换深浅主题。

无需关闭 Gatekeeper，也无需运行终端解锁命令。

## Windows 安装

1. 运行 `YouMingHua-Setup-v1.0.0.exe`，按向导完成当前用户安装。
2. 本测试包未签名。若出现 SmartScreen「Windows 已保护你的电脑」提示，确认文件来源后，可在系统提供该选项时选择 **更多信息 → 仍要运行**。如果 Smart App Control 或单位策略阻止运行且没有继续选项，请反馈具体提示，无需关闭安全功能。
3. 从开始菜单打开「又茗花」，在任务栏右侧托盘中找到图标（可能收在 **∧** 内），选择 **应用或重新应用**，按提示启动官方客户端。
4. 在官方应用的外观设置中选择 **系统 / 跟随系统**，即可自动切换深浅主题。

首次启用时，独立的客户端配置可能要求重新登录账号；之后会保留这套登录状态。

## 日常使用与卸载

- **主题未刷新**：macOS 选择「重新应用皮肤」；Windows 选择「应用或重新应用」。
- **更新**：下载维护者提供的新版安装包，退出又茗花和官方客户端后覆盖安装。本版不会自动更新到原版 Dream Skin。
- **macOS 卸载**：先选择菜单中的「恢复原状并卸载…」，完成后将「又茗花.app」移到废纸篓。
- **Windows 卸载**：先选择托盘菜单中的「完全恢复 Codex」，确认官方客户端恢复后，再到 Windows「设置 → 应用」卸载又茗花。
- **反馈问题**：通过 [Issues](https://github.com/EritechX/YouMingHua/issues) 提供系统版本、官方客户端版本、操作步骤和截图；Windows 请同时注明显示缩放比例，截图中请遮住私人聊天和账号信息。

首页标语为“晓看天色暮看云，行也思君，坐也思君。”。

## 本地构建

macOS 需要 Xcode/Swift 工具链和 Node.js：

```sh
node tools/sync-runtime-assets.mjs --check
node --test tools/*.test.mjs
bash macos/scripts/build-dmg.sh
```

Windows 需要 Windows 10/11 x64、Node.js 22+、.NET 8 SDK、Inno Setup 6.7.1 和 PowerShell：

```powershell
node tools/sync-runtime-assets.mjs --check
node tools/build-theme-manager.mjs
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/tests/run-tests.ps1
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File windows/installer/build-release.ps1
```

`.github/workflows/build-youminghua.yml` 只支持手动构建和上传测试产物，默认仅构建 Windows，产物保留 3 天；不会创建 tag 或发布 Release。上游自动发布工作流保存在 docs/upstream/release.yml.disabled，防止误发布。

## 更新与签名

本版不向原版更新渠道查询或自动更新，后续定制版采用手动覆盖安装。暂不注册原版 dreamskin:// 协议，避免抢占原客户端的网页换肤入口。主题 ZIP 的手动导入保留。

没有开发者证书时，macOS 包只有本地 ad-hoc 签名，Windows 包没有可信发布者签名。它们不等同于 Apple Developer ID 公证包或 Windows Authenticode 正式签名包。费用、申请条件与签名步骤见 [SIGNING.md](SIGNING.md)。

## 可移植性

主题与 renderer 来自 runtime/ 共享源，通过同步工具生成两端资源。macOS 专用的页面内边距/外框修复排除了 Windows；Windows 仍需真实客户端视觉验收。

DISTRIBUTION.json 记录定制版本、引擎基础版本和上游固定提交。TASK_PROGRESS.md 与 .local-evidence/ 仅用于本地工作，不进入分享包。
