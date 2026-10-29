# 又茗花签名与分发

资料核对日期：2026-10-29。当前用户没有开发者会员或代码签名证书。本轮不购买、不申请账号、不上传凭据；先构建本地测试版。

## 费用与选择

| 平台 | 正式途径 | 费用参考 | 对当前小范围分享的影响 |
| --- | --- | --- | --- |
| macOS | Apple Developer Program + Developer ID Application 签名 + Apple 公证 | USD 99/年，按地区结算 | 适合后续希望减少来源拦截提示时采用；不需要上架 App Store |
| Windows | 商业 CA 的 Authenticode 代码签名证书/托管签名 | 微软文档给出的 OV 参考为 USD 150–300/年；实际身份类别、硬件或托管费用另向 CA 核实 | 需要核实 CA 是否接受申请者所在地及个人身份；新签名文件仍可能有 SmartScreen 声誉提示 |
| Windows | Azure Artifact Signing 公共信任 | Basic USD 9.99/月，含 5,000 次签名 | 个人申请目前仅美国/加拿大；如果按中国大陆个人身份申请，这条路径不适用 |

Apple 的公证流程要求 Developer ID 签名；本地 ad-hoc 或自签名不能替代。Windows 商业签名也不保证首次分发完全没有 SmartScreen 提示，不应为“立刻免提示”额外购买 EV 证书。

## macOS 生产流程

1. 用户自行完成 Apple Developer Program 注册、身份验证与付费。
2. 创建并保管 Developer ID Application 证书及私钥；不发送到聊天中。
3. 使用开发者身份给应用及必要的可执行文件签名，采用 hardened runtime 与时间戳；构建脚本的签名选项从本机钥匙串读取身份。
4. 使用 `xcrun notarytool` 提交分发产物，检查公证结果，再 `xcrun stapler staple` 附加票据。
5. 对最终产物做签名、公证和 Gatekeeper 检查，重新生成 SHA-256。所有二进制变更应在签名前完成。

测试包首次系统提示需由用户按系统允许的流程处理，不要关闭 Gatekeeper。

## Windows 生产流程

1. 确认 CA 或签名服务支持申请者所在地和身份，询价时确认私钥硬件/托管、有效期与续期成本。
2. 采用 SHA-256 Authenticode 签名和可信 RFC3161 时间戳。原生客户端和最终 Setup.exe 分别签名；Inno Setup 卸载器如需签名，在编译阶段通过签名工具接入。
3. 用 `signtool verify /pa` 或等效签名验证检查最终 EXE，再生成下载摘要。
4. 在干净 Windows 用户环境中检查安装、启动、卸载及 SmartScreen 行为。不要要求接收者导入自签根证书或关闭 Defender/SmartScreen。

Azure Artifact Signing 不需要 USB token，但有公共信任地域限制。Private Trust 不适合作为朋友电脑上免配置的替代方案。

## 建议

先用本地测试包完成双端安装与视觉验收，再决定是否为签名付费。macOS 的成本明确；Windows 在确定申请地区、身份与 CA 报价前不承诺总价。未购买任何签名服务，源码中的签名接口不会自动消费账户。

## 官方来源

- [Apple Developer 会员费用](https://developer.apple.com/help/account/membership/program-enrollment)
- [Developer ID 与 Gatekeeper](https://developer.apple.com/developer-id/)
- [Apple 公证要求](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [Microsoft Windows 签名方案比较](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- [Azure Artifact Signing 公共信任资格](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)
- [Artifact Signing 价格](https://azure.microsoft.com/en-us/products/artifact-signing)
