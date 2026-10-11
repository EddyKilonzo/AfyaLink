import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { toHttpException } from '../errors/handle-error.js';
import { currentRequestId } from '../request-context.js';

/**
 * Last line of defence: anything not already handled is converted to a
 * consistent JSON error shape. Stack traces and raw driver messages are never
 * sent to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpError: HttpException;
    try {
      httpError = toHttpException(exception, this.logger, `${request.method} ${request.path}`);
    } catch {
      httpError = new HttpException('Something went wrong. Please try again.', 500);
    }

    const status = httpError.getStatus();
    const body = httpError.getResponse();
    const message =
      typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? httpError.message);

    if (response.headersSent) return;
    response.status(status).json({
      statusCode: status,
      error: httpError.name.replace(/Exception$/, ''),
      message,
      path: request.path,
      requestId: currentRequestId() ?? null,
      timestamp: new Date().toISOString(),
    });
  }
}
