# Rui · AI 招聘协作 Agent

一个面向 HR 的对话式招聘工具：用聊天起草 JD、批量上传简历做 AI 评分、按岗位智能推荐候选人、生成面试追问清单。

- 设计契约：`../ai-agent/project/spec.md`
- 实现守则：[CLAUDE.md](./CLAUDE.md)
- 排期：`../ai-agent/project/milestones.md`

---

## 技术栈

Next.js 14 (App Router) · TypeScript · Prisma 7 + **Neon Postgres** · Vercel Blob · Vercel AI SDK v6 · **小米 MiMo `mimo-v2.5-pro`**（Anthropic 兼容协议）· 腾讯云 OCR（扫描件简历降级路径）

部署：Vercel，函数区域 `hkg1`。

---

## 快速开始

```bash
pnpm install
cp .env.example .env.local           # 按提示填值
pnpm db:generate && pnpm db:push     # 同步 Prisma schema 到 Neon
pnpm db:seed                         # 灌入 10 份示例简历 + 4 个 JD
pnpm dev                             # http://localhost:3000
```

**Node ≥ 20.10**，包管理器必须 **pnpm**（npm/yarn 会撕碎 lockfile）。

### 必填环境变量

| 变量 | 用途 |
|---|---|
| `DATABASE_URL` | Neon Pooled connection 串（`-pooler` 子域 + `sslmode=require`） |
| `MIMO_BASE_URL` / `MIMO_API_KEY` | 小米 MiMo 端点 + 密钥；URL **必须以 `/v1` 结尾** |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 读写令牌（简历文件存储） |
| `TENCENT_OCR_SECRET_ID` / `TENCENT_OCR_SECRET_KEY` | 腾讯云 OCR 凭据；扫描件 PDF 走这里 |

其余可选项见 [`.env.example`](./.env.example)。

---

## 常用命令

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 开发服务器（默认 3000，端口占用自动 +1） |
| `pnpm build` / `pnpm start` | 生产构建 / 启动 |
| `pnpm check` | `lint && typecheck`，**提交前必跑** |
| `pnpm test` / `pnpm test:e2e` | Vitest 单测 / Playwright E2E |
| `pnpm db:studio` | Prisma Studio 看数据 |
| `pnpm mimo:smoke` | MiMo 流式 + tool round-trip 烟测（改 `lib/ai/mimo.ts` 后必跑） |
| `pnpm mimo:eval` | 5-case 中性表达评测（改 system prompt 后跑） |

---

## 项目结构

```
app/                  # Next.js App Router
  api/                # 服务端路由（流式 chat / 上传 / 评分 SSE）
  chat/               # 对话主界面 + 右侧动态画布
  jobs/ resumes/      # 职位 / 简历池页面
components/           # 通用 UI 与 icons
lib/
  ai/                 # MiMo 客户端 / tools / prompts / PII 脱敏
  parsers/            # PDF（pdf-parse）+ DOCX（mammoth）+ 文本质量判断
  ocr/                # 腾讯云 OCR 降级
  store/              # zustand stores（canvas / toast / chat-history）
prisma/               # schema + seed
```

---

## 部署

直接连 Vercel。CI 会跑 `prisma generate && next build`（见 `vercel.json`）。函数 region 锁 `hkg1`，与 MiMo 端点同区降低延迟。
