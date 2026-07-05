import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Fail fast if required environment variables are missing
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'HASHID_SALT', 'PORT', 'CORS_ORIGINS'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Required environment variable "${key}" is not set. Aborting.`);
    process.exit(1);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    console.log('Heade1rs:', req.headers);
    next();
  });
  app.enableCors({
    origin: process.env.CORS_ORIGINS, // preserves current '*' behavior; sourced from env now
    methods: ['GET,HEAD,PUT,PATCH,POST,DELETE'],
    allowedHeaders: ['content-type'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
