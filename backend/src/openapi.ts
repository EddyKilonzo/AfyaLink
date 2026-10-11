import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CSRF_HEADER, SESSION_COOKIE } from './common/constants.js';

export const OPENAPI_JSON_PATH = 'api/docs/openapi.json';

/**
 * Serves the generated OpenAPI 3 document as JSON (no Swagger UI, so the API's
 * `default-src 'none'` CSP stays intact; open the JSON in any OpenAPI viewer).
 * Called only outside production, so the attack surface is not published.
 * DTO schemas come from the @nestjs/swagger CLI plugin (nest-cli.json).
 */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AfyaLink API')
    .setDescription(
      'Offline-first community health reporting. Cookie session auth; state-changing requests need the ' +
        'X-CSRF-Token header from GET /api/auth/csrf (or from the login response). See docs/api.md.',
    )
    .setVersion('1.0')
    .addCookieAuth(SESSION_COOKIE)
    .addApiKey({ type: 'apiKey', in: 'header', name: CSRF_HEADER }, 'csrf')
    .addSecurityRequirements('cookie')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, { ui: false, raw: ['json'], jsonDocumentUrl: OPENAPI_JSON_PATH });
}
