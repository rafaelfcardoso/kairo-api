export default () => {
  const nodeEnv = process.env.NODE_ENV || 'local';
  const railwayUrl = process.env.RAILWAY_STATIC_URL;

  // Debug: Log environment variables
  console.log('Loading configuration for environment:', nodeEnv);
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PGHOST: process.env.PGHOST,
    PGPORT: process.env.PGPORT,
    PGUSER: process.env.PGUSER,
    PGDATABASE: process.env.PGDATABASE,
    RAILWAY_STATIC_URL: railwayUrl,
    JWT_SECRET: process.env.JWT_SECRET ? '[REDACTED]' : 'undefined',
    DB_SSL: process.env.DB_SSL,
  });

  // Validate required environment variables
  if (!process.env.JWT_SECRET && nodeEnv !== 'local') {
    console.error('JWT_SECRET is required but not set!');
    throw new Error('JWT_SECRET environment variable is required');
  }

  // Base configuration shared across all environments
  const baseConfig = {
    // Server
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv,

    // API URL - Remove any duplicate domain parts
    api: {
      url: railwayUrl
        ? `https://${railwayUrl}`
        : process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`,
    },

    // JWT
    jwt: {
      secret: process.env.JWT_SECRET || 'your_local_secret_key_here',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // CORS
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },

    // Logging
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };

  // Log configuration (excluding sensitive data)
  console.log('Loaded configuration:', {
    nodeEnv: baseConfig.nodeEnv,
    port: baseConfig.port,
    apiUrl: baseConfig.api.url,
    jwtConfigured: !!baseConfig.jwt.secret,
    corsOrigin: baseConfig.cors.origin,
    logLevel: baseConfig.logging.level,
  });

  // Check if SSL should be disabled via environment variable
  const sslDisabled = process.env.DB_SSL === 'false';

  // Environment-specific configurations
  const envConfigs = {
    local: {
      database: {
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.PGPORT || process.env.DB_PORT, 10) || 5432,
        username: process.env.PGUSER || process.env.DB_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.DB_PASS || '',
        database: process.env.PGDATABASE || process.env.DB_NAME || 'zenith_db',
        ssl: false,
      },
    },
    development: {
      database: {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT, 10),
        username: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: sslDisabled ? false : { rejectUnauthorized: false },
      },
    },
    staging: {
      database: {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT, 10),
        username: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: { rejectUnauthorized: false },
      },
    },
    production: {
      database: {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT, 10),
        username: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: { rejectUnauthorized: false },
      },
    },
  };

  // Ensure the environment exists in our configs, fallback to local if not
  const envConfig = envConfigs[nodeEnv] || envConfigs.local;

  // Merge base config with environment-specific config
  return {
    ...baseConfig,
    ...envConfig,
  };
};
