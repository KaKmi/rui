import { log } from './log';

/**
 * 给 Next.js Route Handler 加请求级日志。
 * 一进一出两条日志（api/start + api/done 或 api/error），共享同一 reqId 方便串联。
 *
 * 注意：对流式接口（/api/chat），HOC 的 done 时间点是 stream 对象返回的时间，
 * 不是流真正结束的时间。流结束日志由 streamText 的 onFinish 单独打。
 */

type AnyHandler<Ctx> = (req: Request, ctx: Ctx) => Response | Promise<Response>;

function newReqId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `r-${Math.random().toString(36).slice(2, 10)}`;
}

export function withApiLog<Ctx>(
  name: string,
  handler: AnyHandler<Ctx>,
): AnyHandler<Ctx> {
  return async (req, ctx) => {
    const reqId = newReqId();
    const t0 = Date.now();
    const url = new URL(req.url);
    log.info('api/start', {
      reqId,
      name,
      method: req.method,
      path: url.pathname,
      query: url.search || undefined,
    });
    try {
      const res = await handler(req, ctx);
      log.info('api/done', {
        reqId,
        name,
        status: res.status,
        ms: Date.now() - t0,
      });
      return res;
    } catch (e) {
      const err = e instanceof Error ? { name: e.name, message: e.message } : { message: String(e) };
      log.error('api/error', { reqId, name, ms: Date.now() - t0, err });
      throw e;
    }
  };
}
