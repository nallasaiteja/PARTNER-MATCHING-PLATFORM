import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : true;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. native mobile HTTP clients, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins === true) return callback(null, true);
      // Support configured web origins and native mobile app origins (Capacitor / Ionic)
      if (
        allowedOrigins.includes(origin) ||
        origin === 'capacitor://localhost' ||
        origin === 'http://localhost' ||
        origin === 'https://localhost' ||
        origin === 'ionic://localhost'
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });

  // Section 12.1.B & 12.1.E: OWASP Security Headers & In-Transit Encryption Enforcement
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Enforce HTTPS redirection in production if forwarded over HTTP
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    // Security Headers
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  });

  // Static public upload paths (Note: ID proofs remain private and authenticated via /api/v1/uploads/id-proof/:profileId)
  app.use('/uploads/photos', express.static(path.join(process.cwd(), 'uploads', 'photos')));
  app.use('/uploads/careers', express.static(path.join(process.cwd(), 'uploads', 'careers')));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}
bootstrap();
