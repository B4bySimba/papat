import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    console.log('Heade1rs:', req.headers);
    next();
  });
  app.enableCors({
    origin: '*', // Allow all origins - adjust this in production!
    // origin: ['https://papat.vercel.app'],
    methods: ['GET,HEAD,PUT,PATCH,POST,DELETE'],
    allowedHeaders: ['content-type'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
