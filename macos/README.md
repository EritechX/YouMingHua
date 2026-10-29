# 又茗花 · macOS

基于 Codex Dream Skin 1.5.21 的固定版本定制，应用版本为 1.0.0。预置「又茗花」壁纸与明暗配色，通过本机回环 CDP 为官方 Codex / ChatGPT 桌面端加载主题。

## 安装测试包

1. 先安装官方 Codex / ChatGPT，启动一次后完全退出。
2. 打开 `YouMingHua-v1.0.0.dmg`，将「又茗花.app」拖入「Applications」。
3. 打开「又茗花」。首次启动会部署独立引擎并准备默认主题；从菜单栏应用皮肤即可。
4. 在官方应用中将外观设为「跟随系统」，主题会配合明暗模式切换。

当前本地测试包仅经过 ad-hoc 签名，没有 Developer ID 签名或 Apple 公证。若 macOS 阻止首次打开，使用「系统设置 → 隐私与安全性 → 仍要打开」完成来源确认；不要关闭 Gatekeeper 或删除隔离属性。

应用要求 macOS 13 或更新版本，DMG 包含 arm64 与 x86_64 两种架构。它读取官方应用已签名的 Node 运行时，不需要接收者额外安装 Node.js。

## 与原版的隔离

- 应用标识：`local.youminghua.desktop`。
- 本机引擎：`~/.codex/youminghua`。
- 状态与个人主题：`~/Library/Application Support/YouMingHua`。
- 启动任务：`local.youminghua.app`、`local.youminghua.injector`。

这些路径独立于原版 Dream Skin。两套换肤器不应同时给同一个 Codex 窗口加载主题；日常选择其中一套使用。又茗花不注册原版的 `dreamskin://` 协议，不迁移或禁用原版 SwiftBar 插件。

内置主题可直接使用，其他主题可以从菜单手动导入普通 ZIP。当前没有配置在线更新源，更新时由分享者提供新版安装包；应用不会自动检查或跳转到上游原版下载页。

## 构建与签名

```sh
./macos/scripts/build-dmg.sh
```

没有签名配置时生成 ad-hoc 测试包。具备 Developer ID Application 身份后，可通过 `YOUMINGHUA_SIGN_IDENTITY` 启用开发者签名；具备已在本机钥匙串保存的公证配置时，再设置 `YOUMINGHUA_NOTARY_PROFILE`。构建脚本会要求签名身份有效，提交公证并 staple 票据，失败时停止构建。

`macos/VERSION` 记录上游引擎版本，`macos/DISTRIBUTION_VERSION` 记录定制应用版本。两者分别保存到应用和内置引擎，更新同一引擎版本的定制包时仍会重新部署新的分发版本。

恢复原生外观或卸载时使用菜单中的恢复入口。它保留主题图片和主题库；最后由用户把「又茗花.app」移到废纸篓。

原项目：[Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)。原作者版权与第三方说明保留在 `LICENSE`、`NOTICE.md`。此定制版不是 OpenAI 官方产品。
