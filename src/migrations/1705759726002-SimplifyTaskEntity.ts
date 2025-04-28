import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class SimplifyTaskEntity1705759726002 extends BaseMigration {
  name = 'SimplifyTaskEntity1705759726002';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
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

    // Check if taskType column exists using base helper
    const taskTypeExists = await this.columnExists(
      queryRunner,
      'task',
      'taskType',
    );

    if (taskTypeExists) {
      // Drop the taskType column if it exists
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "taskType"`);
    }
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
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

    // Drop the needsReminder and reminderMessage columns
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "needsReminder"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "reminderMessage"`,
    );
  }

  // Remove local helper
}
