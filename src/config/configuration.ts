export default () => {
  const nodeEnv = process.env.NODE_ENV || 'local';

  // Debug: Log environment variables
  console.log('Loading configuration for environment:', nodeEnv);
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PGHOST: process.env.PGHOST,
    PGPORT: process.env.PGPORT,
    PGUSER: process.env.PGUSER,
    PGDATABASE: process.env.PGDATABASE,
    RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
  });

  // Base configuration shared across all environments
  const baseConfig = {
    // Server
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv,

    // JWT
    jwt: {
      secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      expiresIn: '24h',
    },

    // CORS
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    },

    // Logging
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };

  // Environment-specific configurations
  const envConfigs = {
    local: {
      api: {
        url: `http://localhost:${baseConfig.port}`,
      },
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
      api: {
        url:
          process.env.RAILWAY_STATIC_URL ||
          'https://zenith-api-nest-development.up.railway.app',
      },
      database: {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT, 10),
        username: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: { rejectUnauthorized: false },
      },
    },
    staging: {
      api: {
        url:
          process.env.RAILWAY_STATIC_URL ||
          'https://zenith-api-staging.up.railway.app',
      },
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
      api: {
        url:
          process.env.RAILWAY_STATIC_URL || 'https://zenith-api.up.railway.app',
      },
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
