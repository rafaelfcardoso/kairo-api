import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyTaskEntity1686501245678 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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

    // Check if taskType column exists
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

    // Drop the needsReminder and reminderMessage columns
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "needsReminder"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "reminderMessage"`,
    );
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
