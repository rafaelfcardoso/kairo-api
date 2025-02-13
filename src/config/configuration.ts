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
  });

  // Base configuration shared across all environments
  const baseConfig = {
    // Server
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv,

    // API URL
    api: {
      url:
        railwayUrl ||
        process.env.API_URL ||
        `http://localhost:${process.env.PORT || 3001}`,
    },

    // JWT
    jwt: {
      secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      expiresIn: '24h',
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
        ssl: { rejectUnauthorized: false },
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
