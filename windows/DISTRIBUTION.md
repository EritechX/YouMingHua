# 又茗花 Windows 构建

此目录是又茗花定制版的 Windows 源码，基于 Dream Skin 1.5.21。分发版本位于 `DISTRIBUTION_VERSION`（当前 1.0.0），引擎协议版本继续使用 `VERSION`（1.5.21）。没有配置在线发布地址；更新菜单只说明如何向分发者取得新安装包。

安装器为当前用户安装到 `%LOCALAPPDATA%\Programs\YouMingHua`，运行状态、主题和引擎放在 `%LOCALAPPDATA%\YouMingHua`。快捷方式显示「又茗花」，Inno AppId 和互斥锁独立于上游。安装器不注册 `dreamskin://`，因此不会接管原版的一键换肤协议。磁盘上可与原版共存；同一 Codex 会话只应启动一个换肤引擎。

全新安装默认加载 `preset-youminghua`，包括 `background.png`、`theme.json`、非空 `theme.css`。构建器固定校验三个文件的 SHA-256，并在安装前检查完整的受管运行时。原来的 Node 运行时和 Inno 语言文件哈希校验、RemoteSigned、路径及进程身份验证、原子替换和恢复流程继续保留。

## Windows 构建环境

- Windows x64 runner；Node.js 22、.NET SDK 8、Inno Setup 6.7.1。
- 在仓库根运行 `node tools/build-theme-manager.mjs`，生成原生主题管理器。
- 运行 `powershell.exe -NoProfile -File windows\tests\run-tests.ps1`。
- 运行 `powershell.exe -NoProfile -File windows\installer\build-release.ps1`。

默认产物是 `release\YouMingHua-Setup-v1.0.0.exe`。构建会下载并校验固定的 Node 22.23.1 x64 ZIP，也可用 `-NodeArchivePath` 指定已下载副本。构建、测试、安装验收、签名和发布是独立阶段；macOS 上通过的 Node 或 .NET Core 检查不等于 Windows 原生安装验收。

## 可选签名

有受信任 Authenticode 证书后，可向构建脚本传入 `-SigningCertificateSha1 <证书指纹> -SignToolPath <signtool.exe 路径>`。证书私钥应位于构建环境的证书存储，不传入源码。构建器会先签名原生主题管理器，再生成并签名安装器，使用 SHA-256 与 HTTPS RFC3161 时间戳，并验证签名为 `Valid`。默认时间戳地址为 `https://timestamp.digicert.com`，可通过 `-TimestampUrl` 配置。

未提供签名参数时生成未签名测试包，不会把临时或自签名证书冒充可信签名。原始上游 MIT 许可与 NOTICE 随包保留。
