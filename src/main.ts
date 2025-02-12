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

  // Enable CORS with configuration
  app.enableCors({
    origin: configService.get('cors.origin'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

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

  // Get the public URL based on environment
  const nodeEnv = process.env.NODE_ENV || 'local';
  const port = process.env.PORT || 3001;

  // Allow override through environment variable
  const publicUrl =
    process.env.API_URL ||
    process.env.RAILWAY_STATIC_URL ||
    (() => {
      switch (nodeEnv) {
        case 'production':
          return 'https://zenith-api.up.railway.app';
        case 'staging':
          return 'https://zenith-api-staging.up.railway.app';
        case 'development':
          return 'https://zenith-api-development.up.railway.app';
        default:
          return `http://localhost:${port}`;
      }
    })();

  // Debug environment variables
  console.log('Environment Variables:', {
    PORT: process.env.PORT,
    NODE_ENV: nodeEnv,
    PUBLIC_URL: publicUrl,
    RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
  });

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
    .addServer(publicUrl, 'API Server')
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

  // Listen on all interfaces (important for Docker)
  await app.listen(port, '0.0.0.0');

  console.log(`Server is listening on port ${port}`);
  console.log(`Application is running on: ${publicUrl}`);
  console.log(`Swagger documentation available at: ${publicUrl}/api`);
  console.log('Database Configuration:', {
    host: configService.get('database.host'),
    port: configService.get('database.port'),
    database: configService.get('database.database'),
    ssl: configService.get('database.ssl'),
  });
}
bootstrap();
