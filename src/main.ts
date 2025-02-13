import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Get DataSource and run migrations
  const dataSource = app.get(DataSource);
  try {
    console.log('Starting database migrations...');

    // Log migration details
    console.log(
      'Available migrations:',
      dataSource.migrations.map((m) => ({
        name: m.name,
      })),
    );

    // Check database connection
    console.log('Database connection status:', {
      isInitialized: dataSource.isInitialized,
      database: dataSource.options.database,
    });

    // Show pending migrations
    const pendingMigrations = await dataSource.showMigrations();
    console.log('Pending migrations:', pendingMigrations);

    // Run migrations
    await dataSource.runMigrations();
    console.log('Database migrations completed successfully');

    // Check applied migrations
    const migrations = await dataSource.query(
      'SELECT * FROM migrations ORDER BY timestamp DESC',
    );
    console.log('Applied migrations:', migrations);

    // Verify the Project table structure
    const tableInfo = await dataSource.query(
      `SELECT column_name, data_type, udt_name, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'project'
       ORDER BY ordinal_position`,
    );
    console.log('Project table structure:', tableInfo);

    // Verify enum types
    const enumTypes = await dataSource.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `);
    console.log('Available enum types:', enumTypes);
  } catch (error) {
    console.error('Error running migrations:', error);
    if (error.code === '42P01') {
      console.error(
        'Migrations table does not exist. This might be a fresh database.',
      );
    }
    throw error;
  }

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
  const allowedOrigins = [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'http://localhost:8080',
    'http://localhost:8100',
  ];

  // Add the Railway URL if it exists
  const railwayUrl = configService.get('api.url');
  if (railwayUrl) {
    allowedOrigins.push(railwayUrl);
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Access-Control-Allow-Origin',
    ],
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

      ## Base URLs
      - Application Root: ${apiUrl}
      - API Documentation: ${apiUrl}/api
      - Health Check: ${apiUrl}/health
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
    //.addServer(`${apiUrl}/api`, 'API Endpoints')
    //.addServer(apiUrl, 'Health Check')
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
  const baseUrl = apiUrl || serverUrl;
  console.log(`Server is listening on port ${port}`);
  console.log('Available endpoints:');
  console.log(`- Application Root: ${baseUrl}`);
  console.log(`- API Documentation: ${baseUrl}/api`);
  console.log(`- Health Check: ${baseUrl}/health`);
  console.log('\nDatabase Configuration:', {
    host: configService.get('database.host'),
    port: configService.get('database.port'),
    database: configService.get('database.database'),
    ssl: configService.get('database.ssl'),
  });
}
bootstrap();
