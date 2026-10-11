import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

interface RequestContext {
  requestId: string;
  ip: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Gives every request an ID (a well-formed incoming X-Request-Id is kept, so a
 * proxy's ID carries through) and returns it in the X-Request-Id header. The
 * ID is available anywhere in the request's async chain for logs and audit rows.
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  storage.run({ requestId, ip: req.ip ?? null }, () => next());
}

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function currentIp(): string | null {
  return storage.getStore()?.ip ?? null;
}
