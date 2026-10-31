# 开发与合并

修改先推送到独立分支，再向 `main` 提交 PR。等待 **PR checks** 通过后，通过 GitHub 的 PR 合并入口合并。审批人数为 0，个人维护时不需要另找审阅者；管理员和自动化也遵守相同规则。

`main` 禁止删除、强制推送和绕过 PR 直接更新。PR 必须基于最新 `main` 通过检查；如果提示分支落后，更新分支后等待检查重新完成。未强制提交签名、线性历史或合并队列。

## 自动测试

`.github/workflows/pr-checks.yml` 在 PR 创建、更新提交和重新打开时自动运行。新提交会取消同一 PR 的旧检查。

| 检查 | 何时运行 | 内容 |
| --- | --- | --- |
| Shared checks | 每个 PR | 六处引擎版本一致、双端定制版本一致、共享资源同步、共享 Node 测试和双端 payload 校验 |
| macOS tests | macOS、共享代码或构建配置变化 | macOS 脚本、Node 与 Swift 测试 |
| Windows tests | Windows、共享代码或构建配置变化 | Windows Node、.NET、PowerShell 与安装器合同测试 |
| PR checks | 每个 PR，包含前序检查失败时 | 汇总所需检查，失败、取消或意外跳过均阻止合并 |

纯 Markdown 或 `docs/` 内容变更只跑共享检查；未知根目录配置变更按双平台处理。规则判断包含删除及重命名文件。工作流使用只读权限、不使用发布凭据。GitHub 托管 runner 没有官方客户端，macOS 套件沿用已有的签名客户端集成测试排除项；本机真实界面验收仍在发版时单独完成。

本地快速检查：

```sh
node tools/check-versions.mjs
node tools/sync-runtime-assets.mjs --check
node --test tools/*.test.mjs
node macos/scripts/injector.mjs --check-payload
node windows/scripts/injector.mjs --check-payload
```

## 分支规则维护

[仓库规则设置](https://github.com/EritechX/YouMingHua/settings/rules) 中的 `Protect main` 规则与 `.github/main-ruleset.json` 对应。该文件是可审查的配置记录；修改文件不会自动变更 GitHub 设置。必需检查名是 `PR checks`，来源限定为 GitHub Actions。不要只改工作流中的检查名，否则合并会一直等待旧名称。

## 构建与发布

完整 DMG/EXE 构建仍使用手动工作流 `Build YouMingHua (manual artifacts only)`。PR 检查不生成安装包、不创建标签、不发布 Release。发布时仍须固定源码提交，执行双平台构建并核对安装包摘要；详见 [Release 说明规范](releases/README.md)。
