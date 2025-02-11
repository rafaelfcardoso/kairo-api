import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTaskStatusEnum1739279174960 implements MigrationInterface {
  name = 'UpdateTaskStatusEnum1739279174960';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, drop the existing enum type constraint
    await queryRunner.query(`
      ALTER TABLE "task" 
      ALTER COLUMN "status" DROP DEFAULT;
    `);

    // Create the new enum type
    await queryRunner.query(`
      CREATE TYPE "public"."task_status_enum_new" AS ENUM (
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
      ADD COLUMN "status_new" "public"."task_status_enum_new";
    `);

    // Migrate the data
    await queryRunner.query(`
      UPDATE "task" 
      SET "status_new" = CASE 
        WHEN "status"::text = 'todo' THEN 'not_started'::task_status_enum_new
        WHEN "status"::text = 'pending' THEN 'not_started'::task_status_enum_new
        WHEN "status"::text = 'in_progress' THEN 'in_progress'::task_status_enum_new
        WHEN "status"::text = 'completed' THEN 'completed'::task_status_enum_new
        ELSE 'not_started'::task_status_enum_new
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
      SET DEFAULT 'not_started'::task_status_enum_new;
    `);

    // Drop the old enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."task_status_enum";
    `);

    // Rename the new enum type to the original name
    await queryRunner.query(`
      ALTER TYPE "public"."task_status_enum_new" 
      RENAME TO "task_status_enum";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Create the old enum type
    await queryRunner.query(`
      CREATE TYPE "public"."task_status_enum_old" AS ENUM (
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
      ADD COLUMN "status_old" "public"."task_status_enum_old";
    `);

    // Migrate data back
    await queryRunner.query(`
      UPDATE "task" 
      SET "status_old" = CASE 
        WHEN "status"::text = 'not_started' THEN 'todo'::task_status_enum_old
        WHEN "status"::text = 'in_progress' THEN 'in_progress'::task_status_enum_old
        WHEN "status"::text = 'blocked' THEN 'pending'::task_status_enum_old
        WHEN "status"::text = 'completed' THEN 'completed'::task_status_enum_old
        ELSE 'todo'::task_status_enum_old
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
      SET DEFAULT 'todo'::task_status_enum_old;
    `);

    // Drop new enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."task_status_enum";
    `);

    // Rename old enum type back to original name
    await queryRunner.query(`
      ALTER TYPE "public"."task_status_enum_old" 
      RENAME TO "task_status_enum";
    `);
  }
}
