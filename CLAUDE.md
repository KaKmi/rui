# CLAUDE.md · Rui 实现仓库的持久指令

> 本文档放在实现仓库根目录，每次 Claude Code 在本仓库工作时自动加载。
> 它**不是**设计规格——设计在 `../ai-agent/project/spec.md`。它是**工作守则**。

---

## 1. 项目类型与栈

- **产品**：AI 招聘协作 Agent · 代号 **Rui**
- **设计契约**：`../ai-agent/project/spec.md` (v0.3+)。**所有视觉、组件 API、字段、接口路径以它为准。**
- **栈**：Next.js 14 (App Router) + TypeScript + Prisma 7 + **Neon Postgres** (经 `@prisma/adapter-neon` + `@neondatabase/serverless`) + **Vercel Blob**（简历文件） + Vercel AI SDK v6 (`ai` + `@ai-sdk/react` + `@ai-sdk/anthropic`) + **小米 MiMo `mimo-v2.5-pro`** (Anthropic 兼容协议)
- **可观测**：自研 `lib/log.ts` + `lib/api-log.ts`（4 级 logger + `withApiLog` HOC）+ `streamText.onFinish` 流结束合并日志 + MiMo fetch 拦截器自动打 `mimo/req` / `mimo/res`
- **包管理器**：pnpm（**不要**用 npm / yarn / bun，会撕碎 lockfile）
- **Node 版本**：≥ 20.10（`engines` 已约束；实测 24.15 跑得最稳）
- **部署目标**：Vercel；Functions 区域默认 `hkg1`（与 MiMo 端点同区，降低跨境延迟）—— 见 `vercel.json`
- **不接外部 LLM**（MiMo 是唯一 LLM 端点）

---

## 2. 命令清单

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 起 dev server（默认 3000；端口被占自动 +1） |
| `pnpm build` | 生产构建 |
| `pnpm start` | 跑 production build |
| `pnpm lint` | ESLint（**不允许 warning**，`--max-warnings=0`） |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm check` | = `pnpm lint && pnpm typecheck`（提交前一键预检） |
| `pnpm test` | Vitest 单测 |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm db:generate` | Prisma client 生成（改 schema 后必跑） |
| `pnpm db:migrate` | 开发期迁移（生产用） |
| `pnpm db:push` | 直接同步 schema 到 Neon（开发期快速迭代用） |
| `pnpm db:seed` | 灌 SEED data（幂等 upsert） |
| `pnpm db:studio` | Prisma Studio 数据浏览 |
| `pnpm db:ping` | Neon 连通性 + 延迟探测 |
| `pnpm mimo:smoke` | MiMo 流式 + tool round-trip 烟测（改 mimo.ts 后必跑） |
| `pnpm mimo:eval` | 5-case 中性表达评测（改 system prompt 后跑） |

**提交前必跑**：`pnpm lint && pnpm typecheck && pnpm test` 全绿。
**改了 `lib/ai/mimo.ts` 或 `lib/ai/prompts/system.ts`**：额外跑 `pnpm mimo:smoke` + `pnpm mimo:eval`。

---

## 3. 设计契约 —— 不可改动项

> 来自 `spec.md §10`「设计 → 工程的硬约束」，违反一律驳回 PR：

- ❌ 不要硬编码 hex（如 `#a78bfa`）。一律走 `var(--neon-1)`。
- ❌ 不要重命名 §5 的组件 Props（`variant` / `tone` / `kind` 等）。
- ❌ 不要改 §6 的页面布局比例（左 2/3 + 右 1/3 等）。
- ❌ 不要增减 §7 的数据字段（可加内部 `_id` 等系统字段）。
- ❌ 不要改 §8 的接口路径与 HTTP 方法。
- ❌ 不要给评分加百分号。
- ❌ 不要把对话气泡改成全宽样式。
- ❌ 不要把霓虹紫换成蓝色"专业"配色。
- ❌ 不要把简历池表格改成卡片。
- ❌ 不要引入 Tailwind / shadcn 等 UI 库（除非把 Token 全量改写）。

---

## 4. 编码规范

### 4.1 TypeScript
- `tsconfig.json` 必须开 `strict: true`、`noUncheckedIndexedAccess: true`。
- 不写 `any`；外部数据进入边界用 zod 校验后才放行。
- API route 入参出参用 zod schema 派生 TS 类型，避免双写。

### 4.2 样式
- 全局 Tokens 在 `app/globals.css :root` 内，**这是唯一定义点**。
- 局部样式用 CSS Modules：`Foo.tsx` + `Foo.module.css`，类名引用 Tokens。
- 禁止 inline `style={{ color: '#xxx' }}`，inline 仅允许 CSS 变量与计算值。
- 密度切换通过 `<html data-density="compact|cozy|roomy">`。

### 4.3 组件
- 客户端组件加 `'use client'`；尽量保持是叶子节点。
- Server Component 直接调 Prisma；不要在 Server 里写 `useState`。
- 表单提交优先 Server Actions，简单 GET 用 fetch + RSC。

### 4.4 Agent 工具（§9）
- 工具定义集中在 `lib/ai/tools/`，每个 tool 一个文件，统一在 `lib/ai/tools/index.ts` 登记。
- **两类工具**：
  - **服务端工具**（有 `execute`）：generate_jd / match_candidates / summarize_pipeline / score_resume(M3)
  - **HITL 工具**（无 `execute`，有 `outputSchema`）：jd-interview/ask_role / ask_level / ask_location / ask_salary / ask_skills / ask_headcount
- HITL 工具靠 `useChat({ sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls })` 续流，前端 widget 渲染在 chat 气泡内，用户操作 → `addToolResult({tool, toolCallId, output})` 回灌。
- 系统提示词集中在 `lib/ai/prompts/`，按场景拆分。
- **中性表达**：禁止 prompt 中出现"建议拒绝/淘汰"等强表态（§9）。改完系统提示词必须跑 `pnpm mimo:eval` 5-case 验证。
- **PII 脱敏**：调 LLM 前一律走 `lib/ai/pii.ts`；日志中不得出现原始姓名 / 电话 / 邮箱。
- **MiMo 适配**（已踩过的两个坑，固化在 `lib/ai/mimo.ts`）：
  1. `MIMO_BASE_URL` 必须以 `/v1` 结尾，SDK 内部会再拼 `/messages`
  2. MiMo 默认开 thinking mode 多轮要求 `reasoning_content` 回传，用 fetch 拦截器在 body 里强塞 `thinking: {type:'disabled'}` 关掉
- 评分等结构化场景优先 `streamObject({ schema })`。Prompt 优先复用 Claude 风格，遇到 MiMo-only 行为差异时按需在 `prompts/` 内分支调整，**不要**预先按模型分目录。

### 4.5 流式
- `/api/chat` 与 `/api/resumes/scan/:taskId` 必须流式（§8 强约束）。
- `/api/chat` 用 `streamText({...}).toUIMessageStreamResponse()`，**必须传 `onFinish` 回调** 把合并后的完整模型输出 + tool calls + token 用量打 `chat/finish` 日志（普通 `api/done` 只测到流对象返回，不是流真正结束）。
- 客户端需处理 `AbortController`；断连 = 取消。spec §6.6.5 "新消息 → 旧流标 cancelled"：发新消息前先 `stop() + cancelPendingHITL() + resetCanvas()`。
- 流式中断后已生成内容**保留可见**（§6.6.4）。
- HITL 工具挂起时用户发新消息：必须把对应 tool 标 `output-error` 否则 Anthropic 协议会报 `Tool result is missing`（详见 `ChatStream.client.tsx` 的 `cancelPendingHITL`）。

### 4.6 日志规范
- 必须用 `lib/log.ts` 的 `log.error/warn/info/debug`，**禁止裸 `console.log`**（ESLint 会拦）。
- API 路由统一用 `withApiLog(name, handler)` HOC 包，自动产 `reqId`。
- 日志 fields 不要带原始 PII（姓名/手机/邮箱）；token / API key 也不能直打。
- LOG_LEVEL 控制（默认 info）：生产保 info；线上排查临时 `LOG_LEVEL=debug pnpm start`。

---

## 5. 文件命名与目录

- 文件名：组件 `PascalCase.tsx`，hooks `useFoo.ts`，工具/lib `kebab-case.ts`，路由 `kebab-case`。
- Client Component 文件名加 `.client.tsx` 后缀（约定，与 `'use client'` 互证）。
- 测试文件与被测文件同目录或 `tests/` 镜像目录。

---

## 6. 提交信息约定

Conventional Commits：
```
feat(chat): 流式 JD 生成接入 generate_jd 工具
fix(scoring): ScoreRing 在 score=null 时显示虚线轨道
chore(deps): 升 next 14.2.5 → 14.2.10
```
范围（scope）建议对齐 §6 页面：`chat` / `jobs` / `resumes` / `ui` / `ai` / `db`。

PR 必须勾选 `spec.md §10` 验收清单的对应项。

---

## 7. 不要做的事

- ❌ 不要在 prod build 留 `console.log`（ESLint 应拦截）。
- ❌ 不要保留 prototype 残留：`data-comment-anchor` / `/*EDITMODE-BEGIN*/` / `/* eslint-disable */`。
- ❌ 不要随便升 React 19 / Next 15（流式 / RSC 行为有破坏性变更，需先评估）。
- ❌ 不要把 Tweaks 面板带到生产（默认 `process.env.NODE_ENV === 'production'` 时隐藏）。
- ❌ 不要给 Server Component 加 `'use client'`，思考下到底要不要 client。
- ❌ 不要绕过 PII 脱敏直接把 raw 简历 prompt 塞给 LLM。
- ❌ 不要把数据库换回 SQLite / MySQL —— 项目跑 **Neon Postgres**（serverless driver + Prisma adapter）。
- ❌ 不要在 Server Component 里直接 `new PrismaClient()`；走 `lib/db.ts` 的单例（serverless 冷启动复用连接）。
- ❌ 不要把简历 PDF/DOCX 写到本地磁盘（Vercel 函数文件系统是临时的）；一律走 `@vercel/blob`。
- ❌ 不要把 LLM 端点指向 Anthropic 官方 / OpenAI / 通义等 —— `MIMO_BASE_URL` 只能指向小米 MiMo。
- ❌ 不要绕过 `@ai-sdk/anthropic` 自己拼 HTTP 请求；MiMo 与 Claude 的协议差异由 SDK + 端点共同承担。

---

## 8. 遇到拿不准时

1. **设计相关** → 翻 `../ai-agent/project/spec.md`，§6.6 "状态与边界" 收口了 90% 的边界 case。
2. **未在 spec 列出的状态** → spec §6.6 开头明确："**未在此列出的状态，工程实现时务必先问 PM/设计**，不要自行发明。"
3. **技术取舍** → 翻 `../ai-agent/project/tech-plan.md`。
4. **进度** → 翻 `../ai-agent/project/milestones.md`。
5. **设计 vs 工程冲突** → spec.md 的态度优先（spec.md §"设计与本入口 README 的态度差异"明确："**以本 spec.md 的态度为准**"）。

---

## 9. 环境变量

见 `.env.example`。必填：
- `DATABASE_URL` —— Neon Postgres 连接串（用 **Pooled connection**，`-pooler` 子域，含 `sslmode=require&channel_binding=require`）
- `MIMO_BASE_URL` —— 小米 MiMo 端点；**必须包含 `/v1` 后缀**（例 `https://token-plan-cn.xiaomimimo.com/anthropic/v1`），SDK 内部会再拼 `/messages`
- `MIMO_API_KEY` —— 密钥
- `BLOB_READ_WRITE_TOKEN` —— Vercel Blob 读写令牌（M3 起需要；Vercel 部署时自动注入；本地用 dashboard 生成）

可选：
- `MIMO_MODEL`（默认 `mimo-v2.5-pro`）
- `MIMO_TIMEOUT_MS`（默认 60000）
- `NEXT_PUBLIC_AGENT_NAME`（侧栏显示名，默认 `Rui`）
- `NEXT_PUBLIC_DEFAULT_ACCENT`（violet | cyan | lime | pink）
- `LOG_LEVEL`（`error | warn | info | debug`，默认 `info`）

**`.gitignore` 已挡 `.env` / `.env.local` / `.env.production`**。绝不要把真值进库；`.env.example` 是模板（占位符值）允许进库。

---

## 10. 验收对照表

PR 描述必须显式声明本次改动对 `spec.md §10` 验收清单的影响：

- [ ] 5 个页面截图与 spec §6 一致
- [ ] 对话流式显示且可中途取消
- [ ] 简历上传 → 进度推送 → 评分显示 端到端通
- [ ] 评分 ScoreRing 颜色阈值与 §4 一致（<60 红 / 60-84 黄 / ≥85 绿）
- [ ] 键盘快捷键全部生效（§6.1）
- [ ] ≥1280 桌面无布局塌陷

---

_本文档与 spec.md / tech-plan.md / milestones.md 同步演化；任一变更需更新 §12 变更记录。_

## 11. 当前实现增量：M3.2 评分流

- `score_resume` 已注册到 `lib/ai/tools/index.ts`，用于对已上传、已解析的单份简历评分并写回数据库。
- 批量评分入口是 `GET /api/resumes/scan/[taskId]?resumeIds=...`，返回 SSE；前端由 `ResumeScan.client.tsx` 监听进度，完成后切到 `resume-results` 画布。
- 上传成功后，`ResumeUpload.client.tsx` 会把本批 `待评分` 的 resume ID 传给 `resume-scan`，不需要用户再手动触发评分。
- 调 LLM 前必须经过 `lib/ai/pii.ts`：手机号、邮箱、身份证、URL、疑似姓名和敏感画像行会被替换；日志禁止打印原始简历正文。
- PDF/DOCX 抽取文本必须经过 `lib/parsers/text-quality.ts` 清洗和质量判断；文本太少、乱码、重复率异常时标记为 `解析失败`，不要进入评分。
- MiMo 结构化输出要按“宽 schema、严 normalize”处理：允许数字字符串、缺失可选字段和偏长摘要，入库前统一 coercion、null fallback、截断。
- 评分结果落库字段包括 `status='AI 已评分'`、`score`、五维 `breakdown`、`summary`、`pros`、`cons`、`interview`、`skills`、`workHistory` 以及可识别的岗位相关基础信息。
- 评分日志使用 `score/start`、`score/finish`、`scan/start`、`scan/done`；`score/finish` 可打印结构化模型输出，但不得包含原始 PII。
