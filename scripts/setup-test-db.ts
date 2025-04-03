import { DataSource } from 'typeorm';
import { Task } from '../src/tasks/tasks.entity';
import { Project } from '../src/projects/projects.entity';
import { Tag } from '../src/tags/tags.entity';
import { FocusSession } from '../src/focus-sessions/focus-sessions.entity';
import { BlockRule } from '../src/entities/block-rule.entity';
import { SystemHealth } from '../src/entities/system-health.entity';
import { ApiRequestLog, ApiMetrics } from '../src/entities/api-metrics.entity';
import * as fs from 'fs';
import * as path from 'path';

// Set environment to test
process.env.NODE_ENV = 'test';

// Define all entities to include in the schema
const entities = [
  Task,
  Project,
  Tag,
  FocusSession,
  BlockRule,
  SystemHealth,
  ApiRequestLog,
  ApiMetrics,
];

// Create a data source specifically for test database setup
const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  username: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: 'zenith_test',
  entities,
  synchronize: true, // Important: This will create or update schema to match entities
  dropSchema: true, // This will drop all tables first
  logging: true,
});

async function setupTestDatabase() {
  console.log('Setting up test database...');

  try {
    // Initialize the data source
    await testDataSource.initialize();
    console.log('Test database connection established');

    // Synchronize schema (create tables)
    console.log('Synchronizing database schema...');

    // No need to call sync explicitly since we enabled synchronize: true

    console.log('Test database setup complete');

    // Create migrations table if it doesn't exist
    const migrationsTableExists = await testDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    if (!migrationsTableExists[0].exists) {
      console.log('Creating migrations table...');
      await testDataSource.query(`
        CREATE TABLE "migrations" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" varchar NOT NULL
        );
      `);
    }

    // Mark all migrations as executed
    console.log('Recording migrations as executed...');

    // Get all migration files from the migrations directory
    const migrationsDir = path.join(__dirname, '../src/migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.match(/^\d+.*\.ts$/) && !file.includes('base'));

    for (const file of migrationFiles) {
      const [timestamp, name] = file.split('-');
      const migrationName = `${name.replace('.ts', '')}${timestamp}`;

      // Check if migration already exists
      const exists = await testDataSource.query(
        `SELECT COUNT(*) FROM migrations WHERE name = $1`,
        [migrationName],
      );

      if (exists[0].count === '0') {
        await testDataSource.query(
          `INSERT INTO "migrations"("timestamp", "name") VALUES ($1, $2)`,
          [parseInt(timestamp), migrationName],
        );
        console.log(`Recorded migration: ${migrationName}`);
      }
    }

    // Create some seed data for testing
    console.log('Seeding test data...');

    // Create default 'Inbox' project if it doesn't exist
    const projectRepository = testDataSource.getRepository(Project);
    const existingInbox = await projectRepository.findOne({
      where: { name: 'Inbox' },
    });

    if (!existingInbox) {
      const inboxProject = projectRepository.create({
        name: 'Inbox',
        description: 'Default project for tasks without a specific project',
        color: '#808080', // Gray
        isSystem: true,
      });

      await projectRepository.save(inboxProject);
      console.log('Created default Inbox project');
    }

    // Seed a few common tags
    const tagRepository = testDataSource.getRepository(Tag);
    const commonTags = [
      { name: 'high-priority', color: '#FF0000' },
      { name: 'test-tag', color: '#00FF00' },
      { name: 'e2e-testing', color: '#0000FF' },
    ];

    for (const tagData of commonTags) {
      const existingTag = await tagRepository.findOne({
        where: { name: tagData.name },
      });

      if (!existingTag) {
        const tag = tagRepository.create(tagData);
        await tagRepository.save(tag);
        console.log(`Created tag: ${tagData.name}`);
      }
    }

    console.log('Test data seeding complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  } finally {
    // Close the connection
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the setup
setupTestDatabase()
  .then(() => {
    console.log('Test database setup script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test database setup script failed:', error);
    process.exit(1);
  });
