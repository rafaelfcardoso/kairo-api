import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';
import { ENUM_TYPES, TaskStatus } from '../config/constants';

export class UpdateTaskStatusEnum1739279174960 extends BaseMigration {
  name = 'UpdateTaskStatusEnum1739279174960';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // First, drop the existing enum type constraint
    await queryRunner.query(`
      ALTER TABLE "task" 
      ALTER COLUMN "status" DROP DEFAULT;
    `);

    // Create the new enum type with a temporary name
    const newEnumName = `${ENUM_TYPES.TASK_STATUS}_new`;
    await queryRunner.query(`
      CREATE TYPE "public"."${newEnumName}" AS ENUM (
        'not_started', 
        'in_progress', 
        'blocked', 
        'completed'
      );
    `);

    // Update existing data to match new enum values
    // First, create a temporary column with the new type
    await queryRunner.query(`
      ALTER TABLE "task" 
      ADD COLUMN "status_new" "public"."${newEnumName}";
    `);

    // Migrate the data with explicit type casting
    await queryRunner.query(`
      UPDATE "task" 
      SET "status_new" = CASE 
        WHEN "status"::text = 'todo' THEN 'not_started'::${newEnumName}
        WHEN "status"::text = 'pending' THEN 'not_started'::${newEnumName}
        WHEN "status"::text = 'in_progress' THEN 'in_progress'::${newEnumName}
        WHEN "status"::text = 'completed' THEN 'completed'::${newEnumName}
        ELSE 'not_started'::${newEnumName}
      END;
    `);

    // Drop the old column and rename the new one
    await queryRunner.query(`
      ALTER TABLE "task" 
      DROP COLUMN "status";
    `);

    await queryRunner.query(`
      ALTER TABLE "task" 
      RENAME COLUMN "status_new" TO "status";
    `);

    // Set the default value for the new status column
    await queryRunner.query(`
      ALTER TABLE "task" 
      ALTER COLUMN "status" 
      SET DEFAULT 'not_started'::${newEnumName};
    `);

    // Drop the old enum type if it exists
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."${ENUM_TYPES.TASK_STATUS}";
    `);

    // Rename the new enum type to the original name
    await queryRunner.query(`
      ALTER TYPE "public"."${newEnumName}" 
      RENAME TO "${ENUM_TYPES.TASK_STATUS}";
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Create the old enum type with a temporary name
    const oldEnumName = `${ENUM_TYPES.TASK_STATUS}_old`;
    await queryRunner.query(`
      CREATE TYPE "public"."${oldEnumName}" AS ENUM (
        'todo', 
        'in_progress', 
        'pending', 
        'completed'
      );
    `);

    // Remove default
    await queryRunner.query(`
      ALTER TABLE "task" 
      ALTER COLUMN "status" DROP DEFAULT;
    `);

    // Add temporary column with old type
    await queryRunner.query(`
      ALTER TABLE "task" 
      ADD COLUMN "status_old" "public"."${oldEnumName}";
    `);

    // Migrate data back with explicit type casting
    await queryRunner.query(`
      UPDATE "task" 
      SET "status_old" = CASE 
        WHEN "status"::text = 'not_started' THEN 'todo'::${oldEnumName}
        WHEN "status"::text = 'in_progress' THEN 'in_progress'::${oldEnumName}
        WHEN "status"::text = 'blocked' THEN 'pending'::${oldEnumName}
        WHEN "status"::text = 'completed' THEN 'completed'::${oldEnumName}
        ELSE 'todo'::${oldEnumName}
      END;
    `);

    // Drop new column and rename old one back
    await queryRunner.query(`
      ALTER TABLE "task" 
      DROP COLUMN "status";
    `);

    await queryRunner.query(`
      ALTER TABLE "task" 
      RENAME COLUMN "status_old" TO "status";
    `);

    // Set the default back
    await queryRunner.query(`
      ALTER TABLE "task" 
      ALTER COLUMN "status" 
      SET DEFAULT 'todo'::${oldEnumName};
    `);

    // Drop new enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."${ENUM_TYPES.TASK_STATUS}";
    `);

    // Rename old enum type back to original name
    await queryRunner.query(`
      ALTER TYPE "public"."${oldEnumName}" 
      RENAME TO "${ENUM_TYPES.TASK_STATUS}";
    `);
  }
}
