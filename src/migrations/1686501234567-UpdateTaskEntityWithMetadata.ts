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
      // Drop the taskType column if it exists
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "taskType"`);
    }

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
