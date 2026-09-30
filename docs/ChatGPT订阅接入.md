# ChatGPT 订阅接入：v0.1.1

验证日期：2026-09-30，Apple Silicon Mac。

## 原因与修复

原独立 Codex 子进程没有继承 macOS 已配置的 HTTPS 系统代理，直接连接官方服务超时。主进程现在读取系统代理并传入子进程环境，不改变系统或 Codex 全局设置。官方 App Server 识别 ChatGPT Plus，使用官方管理的登录。

## 实测

- 代理修复后，gpt-6-luna 返回“订阅连接测试成功”。
- 实际适配器返回虚构散步描述的回答，说明档案尚未保存。
- Electron 沙箱 preload → 来源校验 IPC → 官方 App Server → 设置状态及聊天页真实回答，完整流程成功；聊天默认模型 gpt-6.1-sol。
- 24 项测试通过；真实回复不改变档案、不产生自动草稿；撤回授权后拒绝访问。
- Mac 独立包与实时开发包已生成；没有签名或公证。Windows 订阅连接未实机验证。

## 使用

退出旧 App，打开新版 → 设置 → 检查订阅连接 → 选择模型 → 聊天模式改为 ChatGPT 订阅 → 聊一聊。默认模拟模式。需要记录时可把原始用户描述加入待确认，由本人核对保存。

只用虚构信息。当前成员所需上下文会发给 OpenAI，使用该 ChatGPT 账号的 Codex 额度；报告、简报和通知状态没有变化。普通网页和手机 PWA 没有本机订阅入口。登录凭证不复制到应用或导出资料；不会自动采用 API 计费。

官方说明：https://learn.chatgpt.com/docs/app-server

后续独立登录可评估 Sign in with ChatGPT：https://developers.openai.com/siwc/token-sharing-open-source
