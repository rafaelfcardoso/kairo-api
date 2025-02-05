import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors();

  // Validation pipe with proper settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger setup with more details
  const config = new DocumentBuilder()
    .setTitle('Zenith API')
    .setDescription(
      `
      Task Management API with Projects, Tasks, and Tags.
      
      ## Features
      - Task Management
      - Project Organization
      - Tag System
      - Authentication
    `,
    )
    .setVersion('1.0')
    .addTag('Tasks', 'Task management endpoints')
    .addTag('Projects', 'Project management endpoints')
    .addTag('Tags', 'Tag management endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer(
      process.env.RAILWAY_STATIC_URL ||
        `http://localhost:${process.env.PORT || 3001}`,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Customize swagger UI
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Zenith API Documentation',
  });

  // Get port from Railway or fallback to default
  const port = process.env.PORT || configService.get('PORT') || 3001;

  // Debug environment variables
  console.log('Environment Variables:', {
    PORT: process.env.PORT,
    RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
    RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
    NODE_ENV: process.env.NODE_ENV,
  });

  // Listen on all interfaces
  await app.listen(port, '0.0.0.0');

  // Get the actual URL the app is listening on
  const serverUrl = await app.getUrl();
  console.log(`Server is listening on: ${serverUrl}`);

  // Get the public-facing URL
  const appUrl = process.env.RAILWAY_STATIC_URL
    ? `https://${process.env.RAILWAY_STATIC_URL}`
    : process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : serverUrl;

  console.log(`Application is running on: ${appUrl}`);
  console.log(`Swagger documentation available at: ${appUrl}/api`);
  console.log('Database Configuration:', {
    host: process.env.PGHOST || configService.get('DB_HOST'),
    port: process.env.PGPORT || configService.get('DB_PORT'),
    database: process.env.PGDATABASE || configService.get('DB_NAME'),
  });
}
bootstrap();
