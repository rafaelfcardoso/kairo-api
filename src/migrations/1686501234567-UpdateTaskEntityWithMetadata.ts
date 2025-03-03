import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTaskEntityWithMetadata1686501234567
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if taskType column exists
    const taskTypeExists = await this.columnExists(
      queryRunner,
      'task',
      'taskType',
    );

    if (taskTypeExists) {
      // First, create a temporary column to store the enum values as strings
      await queryRunner.query(
        `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "taskTypeString" character varying`,
      );

      // Convert existing enum values to strings
      await queryRunner.query(`
        UPDATE "task" 
        SET "taskTypeString" = 
          CASE 
            WHEN "taskType" = 0 THEN 'standard'
            WHEN "taskType" = 1 THEN 'reminder'
            WHEN "taskType" = 2 THEN 'newsUpdate'
            WHEN "taskType" = 3 THEN 'jobListing'
            ELSE 'standard'
          END
      `);

      // Drop the enum column
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "taskType"`);

      // Rename the string column to taskType
      await queryRunner.query(
        `ALTER TABLE "task" RENAME COLUMN "taskTypeString" TO "taskType"`,
      );
    } else {
      // If taskType doesn't exist, create it directly
      await queryRunner.query(
        `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "taskType" character varying DEFAULT 'standard'`,
      );
    }

    // Make the column not nullable with default
    await queryRunner.query(
      `ALTER TABLE "task" ALTER COLUMN "taskType" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ALTER COLUMN "taskType" SET DEFAULT 'standard'`,
    );

    // Check if metadata column exists
    const metadataExists = await this.columnExists(
      queryRunner,
      'task',
      'metadata',
    );

    if (!metadataExists) {
      // Add the metadata column
      await queryRunner.query(
        `ALTER TABLE "task" ADD COLUMN "metadata" jsonb DEFAULT '{}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if metadata column exists
    const metadataExists = await this.columnExists(
      queryRunner,
      'task',
      'metadata',
    );

    if (metadataExists) {
      // Drop the metadata column
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "metadata"`);
    }

    // Check if taskType column exists
    const taskTypeExists = await this.columnExists(
      queryRunner,
      'task',
      'taskType',
    );

    if (taskTypeExists) {
      // Create the enum type if it doesn't exist
      await queryRunner.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type_enum') THEN 
            CREATE TYPE "task_type_enum" AS ENUM('0', '1', '2', '3'); 
          END IF; 
        END 
        $$;
      `);

      // Create a temporary column for the enum
      await queryRunner.query(`
        ALTER TABLE "task" ADD COLUMN "taskTypeEnum" "task_type_enum"
      `);

      // Convert strings back to enum values
      await queryRunner.query(`
        UPDATE "task" 
        SET "taskTypeEnum" = 
          CASE 
            WHEN "taskType" = 'standard' THEN '0'
            WHEN "taskType" = 'reminder' THEN '1'
            WHEN "taskType" = 'newsUpdate' THEN '2'
            WHEN "taskType" = 'jobListing' THEN '3'
            ELSE '0'
          END::task_type_enum
      `);

      // Drop the string column
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "taskType"`);

      // Rename the enum column to taskType
      await queryRunner.query(
        `ALTER TABLE "task" RENAME COLUMN "taskTypeEnum" TO "taskType"`,
      );

      // Make the column not nullable with default
      await queryRunner.query(
        `ALTER TABLE "task" ALTER COLUMN "taskType" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "task" ALTER COLUMN "taskType" SET DEFAULT '0'`,
      );
    }
  }

  // Helper method to check if a column exists
  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = '${table}'
        AND column_name = '${column}'
      );
    `);
    return result[0].exists;
  }
}
