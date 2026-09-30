# 常安：AI 功能分工与模型建议

整理日期：2026-09-30。v0.1.1 桌面版已接入可选的 ChatGPT/Codex 订阅聊天，Mac 已实测。报告、问候和周报仍为模拟；本文件其余模型分工仍为设计建议。推荐顺序结合当前功能、中国大陆使用地点与预算目标，尚未通过健康场景对比验证。

## 不需要外部大模型的部分

| 功能 | 程序负责的工作 |
| --- | --- |
| 账号与家庭授权 | 登录、成员隔离、查看/协助整理、撤回；正式版须服务端校验 |
| 确认入档 | 待确认队列、本人确认、修改后保存、拒绝保存 |
| 档案存储 | 药物起止时间、指标、资料来源、确认时间与修改历史 |
| 查询与展示 | 按日期/类型过滤、关键词检索、时间线、图表 |
| 数字核对 | 单位校验、与报告参考区间比较、趋势差值；不等于临床判断 |
| 去重与冲突 | 文件哈希、指标标识、版本差异及待核对状态 |
| 文件处理 | 上传、PDF 文本提取、页面预览与本地 OCR；OCR 可能使用机器学习，但无需外部生成式模型 |
| 定时与通知 | 北京时间每日 06:30、周一合并、推送、重试、勿扰 |
| 周报事实 | 汇总本周已确认记录、待确认项和待办，计算变化 |
| 数据与费用 | 导出、重置、备份、恢复、同步、调用额度和月度上限 |

## AI 功能与第一版默认模型

| AI 功能 | 默认候选 | 使用边界 |
| --- | --- | --- |
| 日常聊天和一次一个追问 | Kimi K2.6 开放平台 API | 提供相关已确认档案，明确未知信息 |
| 聊天提取记录草稿 | Kimi K2.6 API | 提取日期、症状、药名、剂量等；缺失值留空；不直接入档 |
| 自然语言查询 | Kimi K2.6 API | 解析查询条件；程序检索授权档案；回答可回到原记录 |
| 自然语言更正 | Kimi K2.6 API | 识别待修改字段；用户核对差异后确认 |
| 文章、医生建议整理 | Kimi K2.6 API | 保留出处和原文位置，区分一般知识与个人建议 |
| 照片/扫描报告结构化 | Kimi K2.6 视觉 API | 先尝试 PDF 提取或本地 OCR；复杂版面可人工选择 Gemini 3.8 Flash API 复核 |
| 普通报告解释 | Kimi K2.6 API | 引用报告及可靠资料，不能把异常指标自动写成诊断 |
| 复杂资料综合解释 | Kimi K3 API | 用户主动触发；长时间线、多个报告或证据冲突时使用 |
| 用药与症状的关联整理 | Kimi K3 API | 程序对齐日期，模型解释事实/可能性/未知；相互作用须核对可靠药物资料 |
| 日常跟进问题 | 默认模板；需个性化时 Kimi K2.6 API | 定时发送不用 AI；无回复不生成健康状态 |
| 每周简报文字 | 默认程序汇总；需润色时 Kimi K2.6 API | 已确认和待确认分开；变化数值由程序计算 |

可选高级复核为 GPT-6 Sol API，启用前核对实际所在地、账号和数据发送范围。Gemini / OpenAI 不是中国大陆默认必需依赖。以上分配是初始评估方案，不是医疗能力排名；先用虚构样例测试提取准确率、遗漏、来源、延迟和费用。

## 订阅和 CC Switch

- ChatGPT/Codex：官方 App Server 可做本机订阅接口试验；可用模型和额度以账号返回为准。
- Google AI Pro：可用于 Gemini CLI 登录；Gemini API 的项目与费用另行管理。
- Kimi Code：用于交互式编程；健康应用后端使用开放平台接口。
- CC Switch：管理开发工具与本机路由；常安自己的模型选择、权限及费用策略由应用控制。

每次请求只发送当前成员所需资料。切换到其他服务商、特别是海外服务时，在界面说明并取得用户选择；不静默把健康资料发送给多个模型。

## 官方依据

- Kimi 模型与视觉能力：https://platform.kimi.com/
- Kimi Code 和开放平台的区别：https://www.kimi.com/en/help/kimi-code/membership-guide
- Gemini PDF 处理：https://ai.google.dev/gemini-api/docs/document-processing
- Gemini CLI 认证：https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/authentication.mdx
- Gemini API 计费：https://ai.google.dev/gemini-api/docs/billing/
- OpenAI 模型：https://developers.openai.com/api/docs/models
- Codex App Server：https://learn.chatgpt.com/docs/app-server
- OpenAI 支持地区：https://developers.openai.com/api/docs/supported-countries
- Gemini API 支持地区：https://ai.google.dev/gemini-api/docs/available-regions
