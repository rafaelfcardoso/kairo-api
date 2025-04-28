import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class CleanupUnusedTaskTypes1705759726003 extends BaseMigration {
  name = 'CleanupUnusedTaskTypes1705759726003';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Clean up any leftover metadata column if it exists
    await queryRunner.query(`
      ALTER TABLE "task" DROP COLUMN IF EXISTS "metadata";
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Add back the metadata column
    await queryRunner.query(`
      ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}';
    `);
  }
}
