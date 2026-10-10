import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { AppConfig } from './config/configuration.js';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
    configureApp(app);
    const port = app.get<ConfigService<AppConfig, true>>(ConfigService).get('port', { infer: true });
    await app.listen(port);
    logger.log(`AfyaLink API listening on http://localhost:${port}/api`);
  } catch (error) {
    const code = (error as { code?: string }).code;
    const hint = code === 'EADDRINUSE' ? ' Port is already in use; set PORT in .env or stop the other process.' : '';
    logger.error(`Failed to start AfyaLink API: ${error instanceof Error ? error.message : String(error)}.${hint}`);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason instanceof Error ? reason.name : typeof reason}`);
});

await bootstrap();
