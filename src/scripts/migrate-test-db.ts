import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';
import { BlockRule } from '../entities/block-rule.entity';
import { SystemHealth } from '../entities/system-health.entity';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';
import { User } from '../entities/user.entity';
import { SquashedSchema20250428190000 } from '../migrations/1745872541304-20250428190000-SquashedSchema';

// Load environment variables from .env.test
config({ path: path.resolve(process.cwd(), '.env.test') });

const entities = [
  Task,
  Project,
  Tag,
  FocusSession,
  BlockRule,
  SystemHealth,
  ApiRequestLog,
  ApiMetrics,
  User,
];

const migrations = [
  SquashedSchema20250428190000,
];

async function runTestDbMigration() {
  console.log('Creating test database connection...');

  // Verify we're in test mode
  if (process.env.NODE_ENV !== 'test') {
    console.error('This script should only be run with NODE_ENV=test');
    console.error('Current NODE_ENV:', process.env.NODE_ENV);
    process.exit(1);
  }

  // Create a data source specifically for test database
  const testDataSource = new DataSource({
    type: 'postgres',
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'zenith_test',
    entities,
    migrations,
    migrationsRun: true,
    synchronize: false,
    logging: ['error', 'warn', 'info', 'log', 'query'],
  });

  try {
    console.log(`Connecting to test database: ${process.env.PGDATABASE}`);
    await testDataSource.initialize();
    console.log('Test database connection established');

    console.log('Running migrations...');
    await testDataSource.runMigrations({ transaction: 'all' });
    console.log('Migrations completed successfully');

    // Verify the completedAt column exists in the task table
    const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'task' AND column_name = 'completedAt'
    `;
    const result = await testDataSource.query(query);

    if (result.length > 0) {
      console.log(' completedAt column exists in the task table');
    } else {
      console.error(' completedAt column was not created in the task table');
      process.exit(1);
    }

    await testDataSource.destroy();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error running test database migrations:', error);
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the migration
runTestDbMigration();
