import { DataSource } from 'typeorm';
// Import the constant config object directly
import { typeOrmConfig as dbConfigObject } from '../src/config/typeorm.config';

// Helper function for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Export as default function
export default async function teardownTestDatabase() {
  // Use the imported config object directly
  const typeOrmConfig = dbConfigObject;

  // Ensure database name is defined for safety
  if (!typeOrmConfig.database) {
    throw new Error(
      'Test database name is not defined in the TypeORM configuration.',
    );
  }

  // Increase delay significantly
  const teardownDelay = 3000; // 3 seconds
  console.log(`[Teardown] Delaying ${teardownDelay}ms...`);
  await delay(teardownDelay);
  console.log('[Teardown] Delay completed.');

  // Connect to default postgres database
  const tempDataSource = new DataSource({
    ...typeOrmConfig,
    database: 'postgres', // Use default database for dropping
  });

  await tempDataSource.initialize();

  try {
    // Force disconnect other users before dropping
    await tempDataSource.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${typeOrmConfig.database}'
        AND pid <> pg_backend_pid();
    `);
    console.log('[Teardown] Forced disconnection of users from test DB.');

    // Drop the test database using the name from config
    await tempDataSource.query(
      `DROP DATABASE IF EXISTS ${typeOrmConfig.database}`,
    );
    console.log(`[Teardown] Dropped test database: ${typeOrmConfig.database}`);
  } catch (error) {
    console.error('[Teardown] Error during teardown:', error);
    // Decide whether to throw or just log
    throw error;
  } finally {
    await tempDataSource.destroy();
  }
}

// Execute if running directly
if (require.main === module) {
  teardownTestDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
