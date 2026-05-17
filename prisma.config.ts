import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7：`schema.prisma` 不再支持 `datasource.url`，连接信息只能放这里
 * （供 `prisma migrate` / `prisma db push` / `prisma studio` 命令使用）。
 * 运行时连接由 `lib/db.ts` 里的 `@prisma/adapter-neon` + `@neondatabase/serverless` 提供。
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
