/**
 * 结构化日志器。
 * - LOG_LEVEL 控制阈值（默认 info）：debug > info > warn > error；只输出 ≤ 当前阈值的级别。
 * - dev 下彩色对齐输出；prod 下纯 JSON，方便日志聚合（Vercel logs / Datadog / 等）。
 * - 字段 fields 直接 spread 到日志结构里；序列化失败的字段会被替换成占位符。
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const envLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
const threshold = PRIORITY[envLevel] ?? PRIORITY.info;
const isProd = process.env.NODE_ENV === 'production';

const COLOR: Record<LogLevel, string> = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[36m', // cyan
  debug: '\x1b[90m', // grey
};
const RESET = '\x1b[0m';

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, (_k, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    );
  } catch {
    return '"[unserializable]"';
  }
}

function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>) {
  if (PRIORITY[level] > threshold) return;
  const now = new Date();
  const ts = now.toISOString();

  if (isProd) {
    // JSON，单行
    process.stdout.write(
      safeStringify({ ts, level, msg, ...(fields ?? {}) }) + '\n',
    );
    return;
  }

  // 开发：彩色 + 紧凑
  const time = ts.slice(11, 23); // HH:MM:SS.sss
  const tag = `${COLOR[level]}${level.toUpperCase().padEnd(5)}${RESET}`;
  const tail =
    fields && Object.keys(fields).length > 0 ? ' ' + safeStringify(fields) : '';
  // 用 stderr 走 warn/error，stdout 走 info/debug —— 部分日志系统按流分级
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`${time} ${tag} ${msg}${tail}\n`);
}

export const log = {
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
};
