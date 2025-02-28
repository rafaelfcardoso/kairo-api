import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupUnusedTaskTypes1686501256789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clean up any leftover metadata column if it exists
    await queryRunner.query(`
      ALTER TABLE "task" DROP COLUMN IF EXISTS "metadata";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the metadata column
    await queryRunner.query(`
      ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}';
    `);
  }
}
