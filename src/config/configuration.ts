export default () => {
  const nodeEnv = process.env.NODE_ENV || 'local';

  // Debug: Log environment variables
  console.log('Loading configuration for environment:', nodeEnv);
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASS: '***', // Masked for security
    DB_NAME: process.env.DB_NAME,
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
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'zenith_db',
        ssl: false,
      },
    },
    development: {
      api: {
        url: 'https://zenith-api-nest-development.up.railway.app',
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'zenith_db',
        ssl: false,
        url: process.env.DATABASE_PUBLIC_URL, // Optional URL override
      },
    },
    staging: {
      api: {
        url: process.env.API_URL || 'https://zenith-api-staging.up.railway.app',
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'zenith_db',
        ssl: { rejectUnauthorized: false },
        url: process.env.DATABASE_PUBLIC_URL, // Optional URL override
      },
    },
    production: {
      api: {
        url: process.env.API_URL || 'https://zenith-api.up.railway.app',
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'zenith_db',
        ssl: { rejectUnauthorized: false },
        url: process.env.DATABASE_PUBLIC_URL, // Optional URL override
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
