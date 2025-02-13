import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Apply Helmet middleware
  app.use(helmet());

  // Apply global rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Enable CORS with configuration
  app.enableCors({
    origin: configService.get('cors.origin'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
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

  // Get configuration values
  const nodeEnv = configService.get('nodeEnv') || 'local';
  const port = configService.get('port') || 3001;
  const apiUrl = configService.get('api.url');

  // Set global prefix for all routes
  if (nodeEnv !== 'local') {
    app.setGlobalPrefix('api');
  }

  // Debug environment variables
  console.log('Environment Variables:', {
    PORT: port,
    NODE_ENV: nodeEnv,
    API_URL: apiUrl,
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
      - Rate Limiting
      - Security Headers
      - Input Sanitization
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
    .addServer(apiUrl, 'API Server')
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

  const serverUrl = await app.getUrl();
  console.log(`Server is listening on port ${port}`);
  console.log(`Application is running on: ${apiUrl || serverUrl}`);
  console.log(`Swagger documentation available at: ${apiUrl || serverUrl}/api`);
  console.log('Database Configuration:', {
    host: configService.get('database.host'),
    port: configService.get('database.port'),
    database: configService.get('database.database'),
    ssl: configService.get('database.ssl'),
  });
}
bootstrap();
