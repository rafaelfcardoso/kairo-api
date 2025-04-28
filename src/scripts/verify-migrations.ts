import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../config/typeorm.config';
import { InitialSchema1705759726000 } from '../migrations/1705759726000-InitialSchema';
import { UpdateTaskEntityWithMetadata1705759726001 } from '../migrations/1705759726001-UpdateTaskEntityWithMetadata';
import { SimplifyTaskEntity1705759726002 } from '../migrations/1705759726002-SimplifyTaskEntity';
import { CleanupUnusedTaskTypes1705759726003 } from '../migrations/1705759726003-CleanupUnusedTaskTypes';
import { AddNonePriorityEnum1710000000000 } from '../migrations/1710000000000-AddNonePriorityEnum';
import { AddIsSystemToTag1712592000000 } from '../migrations/1712592000000-AddIsSystemToTag';
import { AddNonePriorityEnum1738178127099 } from '../migrations/1738178127099-AddNonePriorityEnum';
import { FixProjectColors1738362321118 } from '../migrations/1738362321118-FixProjectColors';
import { AddHasTimeToTasks1738934197033 } from '../migrations/1738934197033-AddHasTimeToTasks';
import { UpdateTaskStatusEnum1739279174960 } from '../migrations/1739279174960-UpdateTaskStatusEnum';
import { EnsureValidTaskStatuses1739279174961 } from '../migrations/1739279174961-EnsureValidTaskStatuses';
import { AddProjectTypeEnum1739279174962 } from '../migrations/1739279174962-AddProjectTypeEnum';
import { AddFocusSessionEnergyLevelEnum1739279174963 } from '../migrations/1739279174963-AddFocusSessionEnergyLevelEnum';
import { AddTaskTagsTable1739279174963 } from '../migrations/1739279174963-AddTaskTagsTable';
import { AddBlockRuleTypeEnum1739279174964 } from '../migrations/1739279174964-AddBlockRuleTypeEnum';
import { CreateFocusSessionTables1740494148045 } from '../migrations/1740494148045-CreateFocusSessionTables';
import { AddProjectIdToFocusSession1740589432291 } from '../migrations/1740589432291-AddProjectIdToFocusSession';
import { AddRecurringTaskFields1740916550124 } from '../migrations/1740916550124-AddRecurringTaskFields';
import { RemoveTaskTypeColumn1741011691203 } from '../migrations/1741011691203-RemoveTaskTypeColumn';
import { AddRecurrenceRuleColumn1741013788916 } from '../migrations/1741013788916-AddRecurrenceRuleColumn';
import { AddNextDueDateColumn1741014300000 } from '../migrations/1741014300000-AddNextDueDateColumn';
import { AddIsGoalToTagTable1741607800000 } from '../migrations/1741607800000-AddIsGoalToTagTable';
import { CreateSystemHealthTable1741800000000 } from '../migrations/1741800000000-CreateSystemHealthTable';
import { CreateApiMetricsTable1741900000000 } from '../migrations/1741900000000-CreateApiMetricsTable';
import { CreateNlpFeedbackTable1741912345000 } from '../migrations/1741912345000-CreateNlpFeedbackTable';
import { CreateNlpModelPerformanceTable1742000000000 } from '../migrations/1742000000000-CreateNlpModelPerformanceTable';
import { RemoveIsGoalFromTagTable1743380485000 } from '../migrations/1743380485000-RemoveIsGoalFromTagTable';
import { AddCompletedAtToTasks1743458631759 } from '../migrations/1743458631759-AddCompletedAtToTasks';
import { AddUserEntityAndRelations1744054661856 } from '../migrations/1744054661856-AddUserEntityAndRelations';
import { AssignExistingDataToDefaultUser1744054769246 } from '../migrations/1744054769246-AssignExistingDataToDefaultUser';
import { MakeUserIdNonNullable1744054883888 } from '../migrations/1744054883888-MakeUserIdNonNullable';
import { RemoveIsSystemFromTag1744198367443 } from '../migrations/1744198367443-RemoveIsSystemFromTag';
import { AddIsArchivedToTag1744198558505 } from '../migrations/1744198558505-AddIsArchivedToTag';
import { FixMigrationIssues1744204141138 } from '../migrations/1744204141138-FixMigrationIssues';
import * as fs from 'fs';
import * as path from 'path';

async function createTestDatabase(queryRunner: any, sourceDb: string) {
  const testDbName = `${sourceDb}_test_migrations`;
  try {
    // First, terminate any existing connections to the test database
    await queryRunner.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${testDbName}'
    `);

    // Drop test database if it exists
    await queryRunner.query(`DROP DATABASE IF EXISTS "${testDbName}"`);

    // Create fresh test database (not as a template, start from scratch)
    await queryRunner.query(`CREATE DATABASE "${testDbName}"`);
    console.log(`Created fresh test database: ${testDbName}`);

    return testDbName;
  } catch (error) {
    console.error('Error creating test database:', error);
    throw error;
  }
}

/**
 * Verify that all migration files are properly imported and included in the migrations array in typeorm.config.ts
 */
async function verifyMigrationImports() {
  console.log('Verifying migration imports in typeorm.config.ts...');

  // Get all migration files from the migrations directory
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.includes('.d.ts') &&
        !file.includes('index.ts') &&
        !fs.lstatSync(path.join(migrationsDir, file)).isDirectory(),
    );

  // Read the typeorm.config.ts file
  const configPath = path.resolve(__dirname, '../config/typeorm.config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');

  // Check if each migration file is imported and included in the migrations array
  const missingImports = [];
  const missingInArray = [];

  for (const file of migrationFiles) {
    // Extract the class name from the file name
    // Format: 1234567890123-MigrationName.ts
    const match = file.match(/\d+-([A-Za-z]+)\.ts$/);
    if (!match) {
      console.warn(`Could not extract class name from file: ${file}`);
      continue;
    }

    const className = match[1];

    // Check if the class is imported
    const importRegex = new RegExp(`import\\s+{\\s*${className}\\d+\\s*}`, 'i');
    if (!importRegex.test(configContent)) {
      missingImports.push(`${className} (${file})`);
    }

    // Check if the class is included in the migrations array
    const arrayRegex = new RegExp(
      `migrations\\s*=\\s*\\[[^\\]]*${className}\\d+[^\\]]*\\]`,
      's',
    );
    if (!arrayRegex.test(configContent)) {
      missingInArray.push(`${className} (${file})`);
    }
  }

  // Report results
  if (missingImports.length === 0 && missingInArray.length === 0) {
    console.log(
      '✅ All migrations are properly imported and included in the migrations array.',
    );
    return true;
  } else {
    if (missingImports.length > 0) {
      console.error(
        '❌ The following migrations are not imported in typeorm.config.ts:',
      );
      missingImports.forEach((missing) => console.error(`   - ${missing}`));
    }

    if (missingInArray.length > 0) {
      console.error(
        '❌ The following migrations are imported but not included in the migrations array:',
      );
      missingInArray.forEach((missing) => console.error(`   - ${missing}`));
    }

    throw new Error('Migration import verification failed');
  }
}

async function verifyMigrations() {
  let defaultDataSource: DataSource | null = null;
  let testDataSource: DataSource | null = null;
  let testDbName: string | null = null;

  try {
    // First verify that all migrations are properly imported and included in the config
    await verifyMigrationImports();

    // Get the source database name from config
    const sourceDb = typeOrmConfig.database as string;
    if (!sourceDb) {
      throw new Error('Database name not found in configuration');
    }

    // First connect to default database to create test database
    defaultDataSource = new DataSource({
      ...typeOrmConfig,
      database: 'postgres', // Connect to default postgres database
    });

    // Initialize connection to postgres database
    await defaultDataSource.initialize();
    console.log('Connected to postgres database');

    // Create test database as a copy of current database
    testDbName = await createTestDatabase(defaultDataSource.manager, sourceDb);

    // Close default connection
    await defaultDataSource.destroy();
    defaultDataSource = null;

    // Create connection to test database
    testDataSource = new DataSource({
      ...typeOrmConfig,
      database: testDbName,
      migrationsRun: false, // Don't run migrations automatically
      connectTimeoutMS: 30000, // Increase timeout to 30 seconds
    });

    // Initialize test database connection
    await testDataSource.initialize();
    console.log('Connected to test database');

    // Drop all tables to ensure clean state
    await testDataSource.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('Reset database to clean state');

    // Initialize migrations table
    await testDataSource.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" bigint NOT NULL,
        "name" varchar NOT NULL UNIQUE
      );
    `);
    console.log('Initialized migrations table');

    // Run migrations in order
    const migrations = [
      new InitialSchema1705759726000(),
      new UpdateTaskEntityWithMetadata1705759726001(),
      new SimplifyTaskEntity1705759726002(),
      new CleanupUnusedTaskTypes1705759726003(),
      new AddNonePriorityEnum1710000000000(),
      new AddIsSystemToTag1712592000000(),
      new AddNonePriorityEnum1738178127099(),
      new FixProjectColors1738362321118(),
      new AddHasTimeToTasks1738934197033(),
      new UpdateTaskStatusEnum1739279174960(),
      new EnsureValidTaskStatuses1739279174961(),
      new AddProjectTypeEnum1739279174962(),
      new AddFocusSessionEnergyLevelEnum1739279174963(),
      new AddTaskTagsTable1739279174963(),
      new AddBlockRuleTypeEnum1739279174964(),
      new CreateFocusSessionTables1740494148045(),
      new AddProjectIdToFocusSession1740589432291(),
      new AddRecurringTaskFields1740916550124(),
      new RemoveTaskTypeColumn1741011691203(),
      new AddRecurrenceRuleColumn1741013788916(),
      new AddNextDueDateColumn1741014300000(),
      new AddIsGoalToTagTable1741607800000(),
      new CreateSystemHealthTable1741800000000(),
      new CreateApiMetricsTable1741900000000(),
      new CreateNlpFeedbackTable1741912345000(),
      new CreateNlpModelPerformanceTable1742000000000(),
      new RemoveIsGoalFromTagTable1743380485000(),
      new AddCompletedAtToTasks1743458631759(),
      new AddUserEntityAndRelations1744054661856(),
      new AssignExistingDataToDefaultUser1744054769246(),
      new MakeUserIdNonNullable1744054883888(),
      new RemoveIsSystemFromTag1744198367443(),
      new AddIsArchivedToTag1744198558505(),
      new FixMigrationIssues1744204141138(),
    ];

    console.log('Running migrations in sequence...');
    for (const migration of migrations) {
      // Type assertion to handle migrations that might not have a name property
      const migrationName =
        (migration as any).name || migration.constructor.name;
      console.log(`Running migration: ${migrationName}`);
      await migration.up(testDataSource.createQueryRunner());
    }
    console.log('All migrations completed successfully');

    // Verify database structure
    await verifyDatabaseStructure(testDataSource);

    // Close test database connection
    await testDataSource.destroy();
    testDataSource = null;

    // Connect back to postgres to drop test database
    defaultDataSource = new DataSource({
      ...typeOrmConfig,
      database: 'postgres',
    });
    await defaultDataSource.initialize();
    await defaultDataSource.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    await defaultDataSource.destroy();
    defaultDataSource = null;

    console.log('Migration verification completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration verification failed:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    process.exit(1);
  } finally {
    // Ensure all connections are properly closed
    try {
      if (testDataSource?.isInitialized) {
        await testDataSource.destroy();
      }
      if (defaultDataSource?.isInitialized) {
        await defaultDataSource.destroy();
      }
      if (testDbName) {
        // Try to connect to postgres and drop the test database
        const cleanupDataSource = new DataSource({
          ...typeOrmConfig,
          database: 'postgres',
        });
        await cleanupDataSource.initialize();
        await cleanupDataSource.query(
          `DROP DATABASE IF EXISTS "${testDbName}"`,
        );
        await cleanupDataSource.destroy();
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
  }
}

async function verifyDatabaseStructure(dataSource: DataSource) {
  try {
    // Verify essential tables exist and have correct structure
    await verifyTableStructure(dataSource);

    // Verify enum types
    await verifyEnumTypes(dataSource);

    // Verify constraints
    await verifyConstraints(dataSource);

    console.log('Database structure verification successful');
  } catch (error) {
    console.error('Database structure verification failed:', error);
    throw error;
  }
}

async function verifyTableStructure(dataSource: DataSource) {
  const essentialTables = ['migrations', 'task', 'project', 'tag'];

  for (const table of essentialTables) {
    // Check if table exists
    const tableExists = await dataSource.query(
      `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = $1
      );
    `,
      [table],
    );

    if (!tableExists[0].exists) {
      throw new Error(`Required table "${table}" does not exist`);
    }

    // Verify table structure (you can add more specific checks here)
    await dataSource.query(`SELECT * FROM "${table}" LIMIT 1`);
  }
}

async function verifyEnumTypes(dataSource: DataSource) {
  const requiredEnums = [
    'task_status_enum',
    'task_priority_enum',
    'project_type_enum',
    'focus_session_energylevel_enum',
    'block_rule_type_enum',
  ];

  for (const enumType of requiredEnums) {
    const enumExists = await dataSource.query(
      `
      SELECT EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = $1
      );
    `,
      [enumType],
    );

    if (!enumExists[0].exists) {
      throw new Error(`Required enum type "${enumType}" does not exist`);
    }
  }
}

async function verifyConstraints(dataSource: DataSource) {
  // Verify foreign key constraints
  const requiredFKs = [
    { table: 'task', constraint: 'FK_task_project' },
    { table: 'project', constraint: 'FK_project_parent' },
  ];

  for (const fk of requiredFKs) {
    const constraintExists = await dataSource.query(
      `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = $1 
        AND constraint_name = $2
        AND constraint_type = 'FOREIGN KEY'
      );
    `,
      [fk.table, fk.constraint],
    );

    if (!constraintExists[0].exists) {
      throw new Error(
        `Required foreign key "${fk.constraint}" on table "${fk.table}" does not exist`,
      );
    }
  }
}

// Run verification if this script is called directly
if (require.main === module) {
  verifyMigrations();
}
