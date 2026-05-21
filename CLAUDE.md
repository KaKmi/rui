# CLAUDE.md · Rui 实现仓库的持久指令

> 工作守则，不是设计规格。**设计在 `../ai-agent/project/spec.md`**，所有视觉 / 字段 / 接口路径以它为准。

---

## 1. 栈与基础约束

- **产品**：AI 招聘协作 Agent · Rui
- **栈**：Next.js 14 (App Router) · TypeScript · Prisma 7 + Neon Postgres · Vercel Blob · Vercel AI SDK v6 (`@ai-sdk/anthropic`) · **小米 MiMo `mimo-v2.5-pro`**（Anthropic 兼容协议） · 腾讯云 OCR（扫描件降级）
- **可观测**：`lib/log.ts` + `lib/api-log.ts`（4 级 logger + `withApiLog` HOC）+ MiMo fetch 拦截器自动打 `mimo/req` / `mimo/res`
- **包管理器**：pnpm（用 npm / yarn / bun 会撕碎 lockfile）
- **Node**：≥ 20.10
- **部署**：Vercel，函数 region `hkg1`（与 MiMo 同区）
- **LLM 端点**：只接小米 MiMo，不接 Anthropic 官方 / OpenAI / 通义

---

## 2. 命令清单

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 开发服务器 |
| `pnpm build` / `pnpm start` | 生产构建 / 启动 |
| `pnpm check` | `lint && typecheck`，**提交前必跑** |
| `pnpm test` / `pnpm test:e2e` | Vitest 单测 / Playwright E2E |
| `pnpm db:generate` / `pnpm db:push` / `pnpm db:seed` / `pnpm db:studio` | Prisma 一套 |
| `pnpm mimo:smoke` | 改 `lib/ai/mimo.ts` 后必跑（流式 + tool round-trip） |
| `pnpm mimo:eval` | 改 system prompt 后跑（5-case 中性表达评测） |

**提交前必跑**：`pnpm check && pnpm test` 全绿。

---

## 3. 设计契约 —— 不可改动项

来自 `spec.md §10`「设计 → 工程的硬约束」，违反一律驳回 PR：

- ❌ 硬编码 hex（如 `#a78bfa`）。一律走 `var(--neon-1)`
- ❌ 重命名 §5 的组件 Props（`variant` / `tone` / `kind` 等）
- ❌ 改 §6 的页面布局比例（左 2/3 + 右 1/3 等）
- ❌ 增减 §7 的数据字段（可加内部 `_id` 等系统字段）
- ❌ 改 §8 的接口路径与 HTTP 方法
- ❌ 给评分加百分号
- ❌ 把对话气泡改成全宽
- ❌ 把霓虹紫换成蓝色"专业"配色
- ❌ 把简历池表格改成卡片
- ❌ 引入 Tailwind / shadcn 等 UI 库（除非把 Token 全量改写）

---

## 4. 编码规范

**TypeScript**：`strict: true` + `noUncheckedIndexedAccess: true`。不写 `any`；外部数据进入边界用 zod 校验。API route 入参出参用 zod schema 派生 TS 类型。

**样式**：Tokens 在 `app/globals.css :root` 唯一定义。局部样式走 CSS Modules，引用 Tokens。禁止 inline `style={{ color: '#xxx' }}`（CSS 变量与计算值除外）。密度切换：`<html data-density="compact|cozy|roomy">`。

**组件**：Client 组件加 `'use client'` 并尽量做叶子；Server Component 直接调 Prisma，不写 `useState`。文件名：组件 `PascalCase.tsx`，hooks `useFoo.ts`，lib `kebab-case.ts`，Client Component 加 `.client.tsx` 后缀。

**Agent 工具**（`lib/ai/tools/`，统一在 `index.ts` 登记）：
- **服务端工具**（有 `execute`）：generate_jd / match_candidates / summarize_pipeline / score_resume / suggest_questions
- **HITL 工具**（无 `execute`，有 `outputSchema`）：jd-interview/ask_* 6 个，靠 `useChat({ sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls })` 续流；用户操作 → `addToolResult({tool, toolCallId, output})` 回灌
- **中性表达**：prompt 禁止"建议拒绝/淘汰"等强表态，改完跑 `pnpm mimo:eval`
- **PII 脱敏**（已松绑 · 2026-05-20）：调 LLM 前过 `lib/ai/pii.ts`；**姓名保留**（评分卡显示真名），电话 / 邮箱 / 身份证 / URL / 性别年龄继续脱。日志中不得有原始电话 / 邮箱 / 身份证
- **MiMo 适配**（已踩过的坑，固化在 `lib/ai/mimo.ts`）：
  1. `MIMO_BASE_URL` 必须以 `/v1` 结尾，SDK 内部再拼 `/messages`
  2. MiMo 默认开 thinking mode，用 fetch 拦截器在 body 强塞 `thinking: {type:'disabled'}` 关掉
- 评分等结构化场景优先 `streamObject({ schema })`

**流式**：
- `/api/chat` 与 `/api/resumes/scan/:taskId` 必须流式（spec §8 强约束）
- `/api/chat` 用 `streamText({...}).toUIMessageStreamResponse()`，**必须传 `onFinish` 回调**把合并后的完整输出 + tool calls + token 打 `chat/finish` 日志（普通 `api/done` 测的是流对象返回，不是流真正结束）
- spec §6.6.5 "新消息 → 旧流标 cancelled"：发新消息前先 `stop() + cancelPendingHITL() + resetCanvas()`
- HITL 工具挂起时用户发新消息：必须把对应 tool 标 `output-error`，否则 Anthropic 协议报 `Tool result is missing`（见 `ChatStream.client.tsx` 的 `cancelPendingHITL`）

**日志**：用 `lib/log.ts` 的 `log.error/warn/info/debug`，**禁止裸 `console.log`**（ESLint 拦）。API 路由统一 `withApiLog(name, handler)` HOC，自动产 `reqId`。`LOG_LEVEL` 默认 info，线上排查临时 `LOG_LEVEL=debug pnpm start`。

---

## 5. 提交约定

Conventional Commits：

```
feat(chat): 流式 JD 生成接入 generate_jd
fix(scoring): ScoreRing 在 score=null 时显示虚线轨道
chore(deps): 升 next 14.2.5 → 14.2.10
```

scope 对齐 spec §6 页面：`chat` / `jobs` / `resumes` / `ui` / `ai` / `db` / `upload`。

---

## 6. 不要做的事

- ❌ prod build 留 `console.log`（ESLint 拦）
- ❌ 残留 prototype 痕迹：`data-comment-anchor` / `/*EDITMODE-BEGIN*/` / `/* eslint-disable */`
- ❌ 随便升 React 19 / Next 15（流式 / RSC 有破坏性变更，先评估）
- ❌ Server Component 加 `'use client'`，先想清楚到底要不要 client
- ❌ 把数据库换回 SQLite / MySQL —— 项目跑 Neon Postgres
- ❌ Server Component 里直接 `new PrismaClient()`，走 `lib/db.ts` 单例
- ❌ 把简历写本地磁盘（Vercel 函数文件系统是临时的），走 `@vercel/blob`
- ❌ LLM 端点指向 Anthropic 官方 / OpenAI / 通义 —— `MIMO_BASE_URL` 只能指 MiMo
- ❌ 绕过 `@ai-sdk/anthropic` 自己拼 HTTP；MiMo 与 Claude 的协议差异由 SDK + 端点共同承担
- ❌ 绕过 PII 脱敏直接把 raw 简历 prompt 塞给 LLM

---

## 7. 环境变量

见 [`.env.example`](./.env.example)。必填：`DATABASE_URL` · `MIMO_BASE_URL` · `MIMO_API_KEY` · `BLOB_READ_WRITE_TOKEN` · `TENCENT_OCR_SECRET_ID` · `TENCENT_OCR_SECRET_KEY`。

`.gitignore` 已挡 `.env*`；只有 `.env.example` 占位模板可进库。

---

## 8. 遇到拿不准时

1. **设计相关** → `../ai-agent/project/spec.md`，§6.6 "状态与边界" 收口了 90% 的边界 case
2. **未在 spec 列出的状态** → §6.6 开头明确："**未列出的状态务必先问 PM/设计**，不要自行发明"
3. **技术取舍** → `../ai-agent/project/tech-plan.md`
4. **进度** → `../ai-agent/project/milestones.md`
5. **设计 vs 工程冲突** → spec.md 态度优先
