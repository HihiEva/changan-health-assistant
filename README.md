# 常安 · 家庭健康助手

React、TypeScript、Vite 与 Electron 制作的健康助手。支持独立个人档案、虚构家庭体验、ChatGPT 订阅聊天、Markdown 回复及聊天附件。

## Windows 安装

在本仓库 Releases 下载 `ChangAn-0.1.2-Windows-x64-Setup.exe`，适用于 Windows 10/11 x64。安装应用本身不需要 Node.js。也提供 Portable.exe 免安装版及 SHA256SUMS.txt。

真实聊天需要在使用的电脑安装官方 Codex CLI，并用 ChatGPT 登录。进入“我的个人档案”填写、核对资料，在“聊一聊”点击“连接并启用 ChatGPT”，确认发送范围后聊天。订阅模式每次启动默认关闭，错误不会自动回退到付费 API。

照片、文字 PDF、TXT、Markdown、CSV 可通过“添加附件”发送。每次最多 4 个、单个 8 MB、合计 20 MB；扫描 PDF 请改用照片。附件只在本次消息中提供给 AI，后续需要原始内容时请重新添加。

## 数据

个人档案与虚构演示分别存储在本机。未确认资料不会进入档案或发送给 AI；已确认资料、近期聊天、本次消息和本次附件会在用户启用聊天后发送给 OpenAI。回复不会自动修改档案，确认仅表示用户核对录入内容，不代表医疗确诊。

没有跨设备同步或个人档案导入功能。可导出 JSON、Markdown 备份。尚无资料加密、应用锁、真实家庭身份认证或定时通知。仓库及安装包不包含实际用户健康资料、聊天、登录凭证。

## 本地开发与验证

需要 Node.js 24：

```sh
npm ci
npm test
npm run build
npm run dev
```

普通浏览器可体验界面，但无法直接调用电脑 Codex。桌面开发使用 `npm run desktop:start`。

```sh
npm run desktop:build:win
npm run desktop:build:mac
npm run desktop:build:mac:live
```

Mac 实时入口为 `启动Mac实时体验.command`，会将运行用 App 复制到 `~/Applications` 并做本地签名，避免同步文件夹元数据干扰签名。通过用户会话后台服务启动 127.0.0.1:5178 的预览；启动后可关闭终端。实时版依赖源码和 Node.js，界面修改会实时生效；桌面主进程修改需重新打包并退出旧 App。

Windows 发布由 `.github/workflows/windows-release.yml` 在原生 Windows runner 构建：测试、打包、静默安装、启动应用检查界面及附件桥接、生成校验值，再上传 Release。真实 Windows 订阅连接和用户日常安装体验仍需实际电脑验证。

## 结构

- `src/domain.ts`：记录、授权、确认、更正、导出与虚构场景。
- `src/personal.ts`：个人资料及与演示模式隔离的本地存储。
- `src/ai.ts`：当前成员上下文与聊天记录。
- `src/MarkdownMessage.tsx`：Markdown 显示，不执行模型返回的 HTML。
- `desktop/main.cjs` / `preload.cjs`：受来源校验的桌面接口。
- `desktop/codex.cjs`：官方 Codex App Server 订阅连接，不读取登录凭证，无工具执行或文件写入授权。
- `desktop/attachments.cjs`：读取用户选择的附件并在本机解析 PDF 文字。

正式上线仍需完成身份认证、服务端权限、同步、加密、备份恢复和通知测试。安装包尚未商业签名，Mac 尚未公证。
