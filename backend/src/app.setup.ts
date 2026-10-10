import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import type { AppConfig } from './config/configuration.js';

/** Shared HTTP setup, also used by e2e tests so they exercise the real pipeline. */
export function configureApp(nestApp: INestApplication): void {
  const app = nestApp as NestExpressApplication;
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const origins = config.get('corsOrigins', { infer: true });
  const isProduction = config.get('isProduction', { infer: true });

  // Only trust X-Forwarded-For when explicitly configured; otherwise clients
  // could spoof their IP and evade rate limits.
  const trustProxy = config.get('trustProxy', { infer: true });
  if (trustProxy > 0) app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');

  app.setGlobalPrefix('api');

  // JSON-only API: a locked-down CSP and no framing.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );

  // API responses can contain health data: never let browsers or proxies cache them.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  app.use(cookieParser());
  app.useBodyParser('json', { limit: config.get('bodyLimit', { infer: true }) });
  app.useBodyParser('urlencoded', { limit: '16kb', extended: false });

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Hide class/target details from validation error responses.
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
