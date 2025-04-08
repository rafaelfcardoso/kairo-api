import { DataSource } from 'typeorm';
// Import the constant config object directly
import { typeOrmConfig as dbConfigObject } from '../src/config/typeorm.config';
// Import the main dataSource instance to destroy it
import dataSource from '../src/config/typeorm.config'; // Added import

// Export as default function
export default async function setupTestDatabase() {
  // Use the imported config object directly
  const typeOrmConfig = dbConfigObject;

  // Ensure database name is defined for safety
  if (!typeOrmConfig.database) {
    throw new Error(
      'Test database name is not defined in the TypeORM configuration.',
    );
  }

  // Destroy any existing main connection pool before dropping DB (Added logic)
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }

  // Create a temporary test database
  const tempDataSource = new DataSource({
    ...typeOrmConfig,
    database: 'postgres', // Connect to default postgres database first
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

    // Drop test database if it exists using the name from config
    await tempDataSource.query(
      `DROP DATABASE IF EXISTS ${typeOrmConfig.database}`,
    );
    // Create fresh test database using the name from config
    await tempDataSource.query(`CREATE DATABASE ${typeOrmConfig.database}`);
  } finally {
    await tempDataSource.destroy();
  }

  // Initialize connection to test database
  const testDataSource = new DataSource({
    ...typeOrmConfig,
    database: typeOrmConfig.database, // Use the name from config
  });

  await testDataSource.initialize();

  try {
    // Check if migrations table exists before trying to clear it
    const migrationTableExistsResult = await testDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    const migrationTableExists = migrationTableExistsResult[0].exists;

    if (migrationTableExists) {
      // Explicitly clear migrations table before running migrations
      await testDataSource.query(`DELETE FROM migrations`);
      console.log('Cleared migrations table for clean run.');
    } else {
      console.log('Migrations table does not exist, skipping clear.');
    }

    // Now run the migrations
    await testDataSource.runMigrations();
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Error during migration execution:', error);
    throw error; // Re-throw error to fail the setup
  } finally {
    // Ensure connection is destroyed even if migrations fail
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  }
}
