import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class UpdateTaskEntityWithMetadata1705759726001 extends BaseMigration {
  name = 'UpdateTaskEntityWithMetadata1705759726001';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Check if taskType column exists using base class helper
    const taskTypeExists = await this.columnExists(
      queryRunner,
      'task',
      'taskType',
    );

    if (taskTypeExists) {
      // Drop the taskType column if it exists
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "taskType"`);
    }

    // Check if metadata column exists using base class helper
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

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Check if metadata column exists using base class helper
    const metadataExists = await this.columnExists(
      queryRunner,
      'task',
      'metadata',
    );

    if (metadataExists) {
      // Drop the metadata column
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "metadata"`);
    }
  }
}
