import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyTaskEntity1686501245678 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the task_type_enum type if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type_enum') THEN 
          CREATE TYPE "task_type_enum" AS ENUM('standard'); 
        END IF; 
      END 
      $$;
    `);

    // Add the needs_reminder column
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "needsReminder" boolean DEFAULT false`,
    );

    // Add the reminder_message column
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "reminderMessage" character varying`,
    );

    // For existing tasks, extract reminder_message from metadata if it exists
    await queryRunner.query(`
      UPDATE "task" 
      SET "reminderMessage" = metadata->>'reminderMessage'
      WHERE metadata->>'reminderMessage' IS NOT NULL
    `);

    // Update existing tasks that were reminders to have needsReminder = true
    await queryRunner.query(`
      UPDATE "task" 
      SET "needsReminder" = true
      WHERE "taskType" = 'reminder'
    `);

    // Create a temporary column for the enum
    await queryRunner.query(`
      ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "taskTypeEnum" "task_type_enum" DEFAULT 'standard'
    `);

    // Convert all tasks to standard type
    await queryRunner.query(`
      UPDATE "task" 
      SET "taskTypeEnum" = 'standard'::task_type_enum
    `);

    // Drop the string column
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "taskType"`,
    );

    // Rename the enum column to taskType
    await queryRunner.query(
      `ALTER TABLE "task" RENAME COLUMN "taskTypeEnum" TO "taskType"`,
    );

    // Drop the metadata column (optional - you might want to keep it for a while)
    // await queryRunner.query(`ALTER TABLE "task" DROP COLUMN IF EXISTS "metadata"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the metadata column if it was deleted
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'`,
    );

    // Convert reminder messages to metadata
    await queryRunner.query(`
      UPDATE "task" 
      SET "metadata" = jsonb_build_object('reminderMessage', "reminderMessage")
      WHERE "reminderMessage" IS NOT NULL
    `);

    // Create a temporary string column
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "taskTypeString" character varying DEFAULT 'standard'`,
    );

    // Convert tasks with needsReminder to reminder type
    await queryRunner.query(`
      UPDATE "task" 
      SET "taskTypeString" = 
        CASE 
          WHEN "needsReminder" = true THEN 'reminder'
          ELSE 'standard'
        END
    `);

    // Drop the enum column
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "taskType"`,
    );

    // Rename the string column to taskType
    await queryRunner.query(
      `ALTER TABLE "task" RENAME COLUMN "taskTypeString" TO "taskType"`,
    );

    // Drop the needsReminder and reminderMessage columns
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "needsReminder"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "reminderMessage"`,
    );
  }
}
