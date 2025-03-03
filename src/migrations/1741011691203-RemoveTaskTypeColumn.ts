import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTaskTypeColumn1741011691203 implements MigrationInterface {
  name = 'RemoveTaskTypeColumn1741011691203';

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

    // Check if the enum type exists and drop it
    await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_tasktype_enum') THEN 
                    DROP TYPE IF EXISTS "task_tasktype_enum" CASCADE; 
                END IF; 
            END 
            $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // We don't need to recreate the taskType column in down migration
    // as we're intentionally removing it permanently
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
