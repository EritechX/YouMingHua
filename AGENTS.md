# Codex Dream Skin Agent Guide

本文件适用于仓库根目录及全部子目录。平台目录中的 `SKILL.md` 提供运行时操作细节；与本文件冲突时，优先遵守更严格的安全和发布要求。

## 开始任务

- 先阅读根目录 README、**最新的 `docs/handoff-*.md`**、相关平台文档、当前分支状态和目标文件，不凭记忆推断现状。交接文档是了解当前状态最快的入口：`main` 上有哪些已合并但未发布的提交、哪些事卡在外部确认、以及本机做不了哪些验证。
- 修改前阅读 [`docs/development.md`](docs/development.md)，核对 `.github/workflows/pr-checks.yml` 和 `.github/main-ruleset.json`。历史交接文档可能来自上游或旧版本；当前仓库文件、远端分支和已生效规则决定实际流程。
- 中大型任务必须建立或更新根目录 `TASK_PROGRESS.md`。记录目标、范围、当前分支或 worktree、已完成项、进行中项、阻塞、测试结果、PR、合并及 Release 状态。
- 在每个里程碑、任务切换、出现阻塞、准备交接以及上下文可能压缩前更新 `TASK_PROGRESS.md`。内容必须可让新 Agent 直接续做，不只写“处理中”。
- `TASK_PROGRESS.md` 是本地连续性文件，不提交密钥、令牌、Webhook、个人路径中的隐私数据或未经确认的生产配置。
- `TASK_PROGRESS.md`、`.local-evidence/` 等任务流水与本机证据只保留本地，禁止提交；`main` 文件树不得包含 `TASK_PROGRESS.md`。已跟踪的进度文件须取消跟踪并保留本地副本。

## 优先级

1. P0：安全问题、数据损坏、不可恢复卸载、错误发布、公开密钥和供应链风险。
2. P1：用户无法安装、启动、恢复、导入或应用主题，以及发布版本与代码不一致。
3. P2：兼容性、性能、交互和可维护性改进。
4. P3：文档润色和非阻塞清理。

- 最新的明确用户指令可以调整当前优先级。插入高优任务时，先把被中断任务的精确状态写入 `TASK_PROGRESS.md`。
- 不把待定事项擅自升级为前置条件，也不把无关 Issue 或 PR 拉入当前范围。

## 多 Agent 协作

- 中大型且可独立拆分的任务默认并行分给多个 Agent；每个子任务必须有清晰边界、输入、允许的写入范围和验收条件。
- 主 Agent 负责计划、冲突协调、最终集成、回归测试和事实核对。子 Agent 的“完成”不能代替主 Agent 验收。
- 多个写入任务优先使用独立分支或 worktree。所有 Agent 共享文件系统，编辑前必须检查现有改动，禁止覆盖、回滚或顺手提交他人的工作。
- 同一文件由一个 Agent 负责写入；无法避免时先协调所有权。只读审计可以并行，但不能伪装成已经实现或验证。
- 页面或原生交互需要实机证据时使用项目指定的浏览器或原生测试工具；工具不可用必须明确记录缺口。

## 进度与事实表述

- 严格区分：本地实现、已测试、已提交、已推送、PR 已开、PR 已合并、tag 已创建、Release 已发布、用户已可下载。
- `merged != released`。只有 GitHub Release 已公开、目标版本资产存在且可下载，才能说“已发布”。
- 只有安装包实际包含目标代码并完成对应版本验证，才能说用户通过 Release 获得了功能。
- Issue 只有在修复、证据、回复和状态都核对后才能说“已处理”；受上游限制或证据不足时保持真实状态。

## 主题 ZIP 合同

- 客户端只导入普通 `.zip`，不支持 `.dreamskin`，也不接受仅修改扩展名的伪装文件。
- 新主题必须同时包含非空 `theme.json`、非空 `theme.css` 和 `theme.json` 引用的唯一背景图；三者缺一不可。
- 背景图最大 10 MiB，并继续执行像素、尺寸、媒体魔数和解码校验。前端、Studio、服务端和双端客户端的限制必须一致。
- 正式 Studio 包还必须校验 `manifest.json` 的平台、最低客户端版本、注册文件集合、字节数和 SHA-256。未知文件、重复路径、路径穿越、链接、reparse、嵌套归档、压缩炸弹和歧义根目录必须 fail closed。
- `theme.css` 在导入时和每次应用时都必须通过共享 Safe CSS 策略，只允许作用于登记的公开主题部件。不得为新导入包增加旧主题兼容旁路。
- 导入成功只写入“已保存主题”库，不自动切换活动主题，也不覆盖 last-known-good。用户必须在菜单中明确选择后才应用。
- 手动移动目录仅用于可信、已解压的完整三文件主题；不得把它描述为与受限 ZIP 导入器同等安全。

## 实现与测试

- 优先复用 `runtime/` 的共享源，通过现有同步工具生成双端资产；不要直接制造 macOS、Windows 漂移。
- 底层引擎版本变更必须同步 `macos/VERSION`、`windows/VERSION`、`macos/package.json`、`macos/scripts/common-macos.sh`、`macos/scripts/injector.mjs` 和 `windows/scripts/injector.mjs`。定制发行版本由双端 `DISTRIBUTION_VERSION` 单独管理，两端必须一致，不要求与引擎版本相同；只升级定制发行版时不改引擎版本。同步相关版本断言，并运行 `node tools/check-versions.mjs`。
- 修改主题 schema、manifest、Safe CSS、导入或提取逻辑时，必须覆盖合法包、缺件、空文件、边界大小、哈希不符、路径攻击、链接、嵌套归档、压缩滥用、重复导入和 ID 冲突。
- 修改共享 renderer 或 CSS 时，运行同步校验和双端 payload 检查；不得只验证一个平台副本。
- macOS 相关改动至少运行适用的 Node、shell 语法和 Swift 测试；Windows 相关改动至少运行适用的 Node 与 PowerShell 测试。无法在本机执行的平台测试必须交给 CI 并明确说明。
- 发布前必须通过版本一致性、仓库 CI、DMG/Setup 构建与挂载或静态校验，并对原生文件选择器、ZIP 导入、已保存主题切换和真实 Codex 渲染做 smoke test。
- 不为追求绿色测试降低安全断言、跳过失败用例或把真实失败改成无条件 skip。

## PR、测试与合并（默认执行流程）

所有项目修改，包括文档、CI、版本准备和紧急修复，都通过独立分支和 PR 合入 `main`。用户要求完成修改时，默认完成提交、推送、PR、检查和合并；用户明确要求仅审查、仅准备或暂不合并时，按指定范围执行。

1. **检查工作区和基线。** 查看 `git status`、当前分支及远端状态，获取最新 `origin/main`。创建或使用合适的任务分支；保留用户已有改动，不为同步基线执行会丢弃工作内容的操作。
2. **修改并做适用的本地验证。** 纯文档修改至少执行 `git diff --check`；代码或构建配置修改执行下方快速检查及相关平台测试。不能在本机运行的原生测试交给 CI，并记录真实界面验证缺口。
3. **审查并提交。** 暂存文件仅限当前任务，提交前检查 staged diff。所有提交信息（包括 squash/merge 的标题和正文）使用英文；推送任务分支，向 `main` 创建 PR，写明最终行为变化、验证结果和实际限制。
4. **等待当前提交的自动检查。** 跟进 PR 自动触发的 `PR validation`，直到最新提交的 `PR checks` 成功。失败则定位日志、修复并推送到同一 PR，等待新一轮检查；取消或旧提交的成功结果不能代替当前检查。若 `main` 已前进，更新任务分支后重新检查。
5. **通过 PR 合并入口合并。** 检查 PR 的最新 head 与已验证提交一致，再使用 GitHub 的 PR 合并 API、CLI 或界面正常合并。不得通过直接推送 `main`、更新远端 ref、强制合并、管理员绕过或临时关闭规则来代替正常合并。
6. **核对并同步。** 确认 PR 已合并、远端 `main` 已包含改动，再安全同步本地 `main`。最终汇报 PR 链接、检查结果和未解决事项；没有实际发布时不要把合并称为发布。

本地快速检查：

```sh
node tools/check-versions.mjs
node tools/sync-runtime-assets.mjs --check
node --test tools/*.test.mjs
node macos/scripts/injector.mjs --check-payload
node windows/scripts/injector.mjs --check-payload
```

### 自动检查的判定

- `Shared checks` 每个 PR 都运行：版本一致性、共享资源同步、共享 Node 测试和双端 payload 校验。
- `macOS tests` / `Windows tests` 根据改动范围运行。共享代码、工具、工作流和未知根目录配置按双平台处理；纯 Markdown 或 `docs/` 变更只跑共享检查。
- `PR checks` 始终汇总结果。只有范围判断明确不需要的平台测试允许显示 `skipped`；所需检查失败、取消、缺失或意外跳过都不得合并。
- PR 工作流只使用读取权限，第三方 Actions 固定完整提交 SHA；不使用发布凭据，不生成 DMG/EXE、不创建标签、不发布 Release。完整安装包构建保留在手动工作流中。

### 已启用的 main 保护

- [Protect main](https://github.com/EritechX/YouMingHua/rules/26264723) 禁止删除和强推，要求通过 PR 合并。
- 必需检查为 GitHub Actions 来源的 `PR checks`，必须基于最新 `main` 通过。审批人数为 **0**，不另行要求第二人批准；管理员和自动化均没有绕过名单。
- 未强制提交签名、线性历史或合并队列。不要为完成普通任务额外增加审批门槛。
- `.github/main-ruleset.json` 是规则的配置记录，修改文件不会自动更新 GitHub 设置。变更检查名称或保护规则时必须同步工作流与远端配置，并验证实际 PR 的阻止和放行行为，避免留下永远等待的必需检查。

## 发布

- 每次发布遵循 [`docs/releases/README.md`](docs/releases/README.md) 的内容规范：版本 PR 必须包含中文 `docs/releases/vX.Y.Z.md` 和完整英文 `docs/releases/vX.Y.Z-en.md`，顶部互链；以用户可感知的新增、修复和升级说明为先，附贡献者与完整变更链接；Release 展示中文正文，发布时追加下载信息。构建和发布的执行方式以本节的当前流程为准。

- 保留用户现有改动；禁止未经授权的 reset、checkout 丢弃、强推、移动已公开 tag 或覆盖已公开 Release。
- 当前安装包由手动工作流 `Build YouMingHua (manual artifacts only)` 构建；合并或修改版本号不会自动创建 Release。文档、CI 和维护规则修改无需另发客户端版本，不改动已发布的安装包。
- 构建与发布按用户已授权的范围执行。已要求发布时，同一轮完成版本准备 PR、检查、合并、双端构建、校验和发布，不停在源码合并阶段；只有源码修改任务时，按上面的 PR 流程完成即可。
- 发布前验证引擎与定制版本各自一致、发行版本递增、tag 与构建提交一致、目标 Release 尚未公开。已公开 tag 不移动；重试同一发布构建时固定同一提交。
- 构建资产必须来自 tag 对应提交。发布前核对 DMG、Setup.exe、`SHA256SUMS.txt` 的文件名、非空大小和摘要；发布后再次核对 Release 为公开状态且三个资产齐全。
- 发布失败时保留可诊断状态，不把不完整资产标记为成功，也不通过重用旧版本号规避更新检测。

## 安全边界

- 不提交 GitHub token、Cloudflare 凭据、飞书或邮件 Webhook、签名私钥、用户数据和本机状态文件。示例只能使用明确占位符。
- 使用最小 GitHub Actions 权限并固定第三方 Action 的完整 commit SHA。发布写权限只授予需要创建 tag 或 Release 的 job。
- 不修改官方 Codex/ChatGPT 的 `app.asar`、签名、系统 ACL 或受保护安装目录；不要求关闭 Gatekeeper、Defender、SmartScreen 或执行 `ExecutionPolicy Bypass`。
- 安装、升级和卸载必须保留原子 staging、备份与回滚，验证目标身份后才操作进程或路径。拒绝不可信符号链接和路径重定向。
- 对外部包、网络响应和状态文件使用有界读取、严格 schema、内容校验和 fail-closed 行为；日志和错误信息不得泄露凭据或私人路径内容。
