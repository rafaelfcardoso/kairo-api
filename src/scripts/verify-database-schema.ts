import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';

/**
 * This script verifies that the database schema matches the entity definitions.
 * It checks that all columns defined in the entities exist in the database tables.
 * This helps catch migration issues where columns might be missing.
 */
async function verifyDatabaseSchema() {
  const logger = new Logger('SchemaVerification');
  logger.log('Starting database schema verification...');

  try {
    // Create a nest application to access the DataSource
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    const dataSource = app.get<DataSource>(getDataSourceToken());

    // List of entities to check
    const entitiesToCheck = [
      { entity: Task, name: 'Task' },
      { entity: Project, name: 'Project' },
      { entity: Tag, name: 'Tag' },
      { entity: FocusSession, name: 'FocusSession' },
    ];

    let allValid = true;
    const issues = [];

    // Check each entity
    for (const { entity, name } of entitiesToCheck) {
      logger.log(`Checking ${name} entity...`);

      // Get metadata from entity
      const entityMetadata = dataSource.getMetadata(entity);
      const entityColumns = entityMetadata.columns
        .filter((col) => !col.relationMetadata) // Filter out relation columns
        .map((col) => {
          return {
            propertyName: col.propertyName,
            databaseName: col.databaseName,
          };
        });

      // Get table name from metadata
      const tableName = entityMetadata.tableName;

      // Query database for actual columns
      const query = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND table_schema = 'public'
      `;
      const tableColumns = await dataSource.query(query);
      const dbColumns = tableColumns.map((col) => col.column_name);

      logger.log(
        `  Database columns for ${tableName}: ${dbColumns.join(', ')}`,
      );

      // Check that all entity columns exist in the database
      const missingColumns = [];
      for (const column of entityColumns) {
        // Skip virtual columns and other special cases
        if (['isCompleted'].includes(column.propertyName)) {
          continue;
        }

        if (!dbColumns.includes(column.databaseName)) {
          missingColumns.push({
            entity: name,
            property: column.propertyName,
            expectedColumn: column.databaseName,
          });
          allValid = false;
        }
      }

      if (missingColumns.length > 0) {
        issues.push(...missingColumns);
        logger.error(
          `  Missing columns in ${name} table: ${missingColumns.map((c) => c.expectedColumn).join(', ')}`,
        );
      } else {
        logger.log(
          `  All ${entityColumns.length} columns from ${name} entity exist in the database`,
        );
      }
    }

    // Summarize results
    if (allValid) {
      logger.log('✅ All entity columns exist in the database schema');
    } else {
      logger.error(`❌ Found ${issues.length} schema inconsistencies:`);
      issues.forEach((issue, index) => {
        logger.error(
          `  ${index + 1}. ${issue.entity}: Column '${issue.expectedColumn}' (${issue.property}) is missing`,
        );
      });

      logger.error('\nTo fix these issues, you need to:');
      logger.error('1. Create a new migration to add the missing columns');
      logger.error('2. Run the migration on all environments');
      logger.error('\nExample migration for the missing columns:');

      // Group issues by entity for the migration example
      const entitiesWithIssues = [
        ...new Set(issues.map((issue) => issue.entity)),
      ];
      let migrationExample = '';

      for (const entityName of entitiesWithIssues) {
        const entityIssues = issues.filter(
          (issue) => issue.entity === entityName,
        );
        const tableName =
          entityName.charAt(0).toLowerCase() + entityName.slice(1);

        migrationExample += `// For ${entityName} table\n`;
        for (const issue of entityIssues) {
          migrationExample += `await queryRunner.query(\`ALTER TABLE "${tableName}" ADD "${issue.expectedColumn}" COLUMN_TYPE\`);\n`;
        }
        migrationExample += '\n';
      }

      logger.error(migrationExample);
    }

    await app.close();

    // Exit with proper code
    if (!allValid) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Error verifying database schema:', error);
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  verifyDatabaseSchema();
}
