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

  // Get port and host configuration
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  // Get the Railway-provided URL or construct a local one
  const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${port}`;

  console.log(`Application is running on: ${railwayUrl}`);
  console.log(`Swagger documentation available at: ${railwayUrl}/api`);
  console.log('Database Configuration:', {
    host: process.env.PGHOST || configService.get('DB_HOST'),
    port: process.env.PGPORT || configService.get('DB_PORT'),
    database: process.env.PGDATABASE || configService.get('DB_NAME'),
  });
}
bootstrap();
