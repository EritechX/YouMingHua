# 又茗花

基于 [Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin) v1.5.21 的本地定制发行版。内置又茗花主题、明暗配色和界面兼容补丁，面向 macOS 与 Windows 小范围试用。

定制版 1.0.0，引擎基础版本 1.5.21。此仓库用于源码维护和手动生成测试安装包；在线构建产物不等同于已完成实机验收的正式版。沿用上游 MIT 许可及版权声明，非 OpenAI 官方产品。上游说明保留在 README.upstream.md。

## 安装体验

先安装并启动一次官方 Codex/ChatGPT 桌面端，再安装本平台的又茗花客户端。首次安装部署独立引擎并准备默认主题，启动皮肤即可使用，不需要另行导入主题 ZIP 或运行补丁脚本。

应用及快捷方式显示为「又茗花」。独立安装和状态目录避免覆盖原版 Dream Skin。两个换肤程序不要同时为同一个 Codex 窗口注入皮肤；切换前退出正在运行的另一套换肤工具。

默认主题采用原生应用的明暗偏好；在官方应用中选择“跟随系统”即可自动切换。首页标语为“晓看天色暮看云，行也思君，坐也思君。”。

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
