# CLAUDE.md · Rui 实现仓库的持久指令

> 本文档放在实现仓库根目录，每次 Claude Code 在本仓库工作时自动加载。
> 它**不是**设计规格——设计在 `../ai-agent/project/spec.md`。它是**工作守则**。

---

## 1. 项目类型与栈

- **产品**：AI 招聘协作 Agent · 代号 **Rui**
- **设计契约**：`../ai-agent/project/spec.md` (v0.3+)。**所有视觉、组件 API、字段、接口路径以它为准。**
- **栈**：Next.js 14 (App Router) + TypeScript + Prisma 7 + **Neon Postgres** (经 `@prisma/adapter-neon` + `@neondatabase/serverless`) + **Vercel Blob**（简历文件） + Vercel AI SDK + **小米 MiMo `mimo-v2.5-pro`** (Anthropic 兼容协议，经 `@ai-sdk/anthropic` 自定义 `baseURL` 接入)
- **包管理器**：pnpm（**不要**用 npm / yarn / bun，会撕碎 lockfile）
- **Node 版本**：≥ 20.10（`engines` 已约束）
- **部署目标**：Vercel；Functions 区域默认 `hkg1`（与 MiMo 端点同区，降低跨境延迟）—— 见 `vercel.json`
- **不接外部 LLM**（MiMo 是唯一 LLM 端点）

---

## 2. 命令清单

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 起 dev server（默认 3000） |
| `pnpm build` | 生产构建 |
| `pnpm start` | 跑 production build |
| `pnpm lint` | ESLint（**不允许 warning**，`--max-warnings=0`） |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest 单测 |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm db:generate` | Prisma client 生成 |
| `pnpm db:migrate` | 开发期迁移 |
| `pnpm db:seed` | 灌入 spec 的 SEED data |
| `pnpm db:studio` | 数据浏览 |

**提交前必跑**：`pnpm lint && pnpm typecheck && pnpm test` 全绿。

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
- 工具定义集中在 `lib/ai/tools/`，每个 tool 一个文件，导出 `tool()` 实例。
- 系统提示词集中在 `lib/ai/prompts/`，按场景拆分。
- **中性表达**：禁止 prompt 中出现"建议拒绝/淘汰"等强表态（§9）。
- **PII 脱敏**：调 LLM 前一律走 `lib/ai/pii.ts`；日志中不得出现原始姓名 / 电话 / 邮箱。
- **MiMo 适配**：Anthropic 兼容协议，`tool_use` / 流式 / messages 与 Claude 一致；评分等结构化场景优先 `streamObject({ schema })`。prompt 优先复用 Claude 风格，遇到行为差异时按需在 `prompts/` 内分支调整，**不要**预先按模型分目录。

### 4.5 流式
- `/api/chat` 与 `/api/resumes/scan/:taskId` 必须流式（§8 强约束）。
- 客户端需处理 `AbortController`；断连 = 取消。
- 流式中断后已生成内容**保留可见**（§6.6.4）。

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
- `DATABASE_URL` —— Neon Postgres 连接串（`postgres://...neon.tech/...?sslmode=require`）
- `BLOB_READ_WRITE_TOKEN` —— Vercel Blob 读写令牌（部署时 Vercel 自动注入；本地开发用 dashboard 生成的 token）
- `MIMO_BASE_URL` —— 小米 MiMo Anthropic-compatible 端点 URL
- `MIMO_API_KEY` —— 密钥

可选：`MIMO_MODEL`（默认 `mimo-v2.5-pro`）、`MIMO_TIMEOUT_MS`、`NEXT_PUBLIC_AGENT_NAME` 等。

切勿把 `.env.local` / `.env.production` 提交进库。

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
