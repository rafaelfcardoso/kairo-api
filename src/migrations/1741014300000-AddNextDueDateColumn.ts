import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNextDueDateColumn1741014300000 implements MigrationInterface {
  name = 'AddNextDueDateColumn1741014300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if nextDueDate column exists
    const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'task'
                AND column_name = 'nextDueDate'
            );
        `);

    const columnExists = result[0].exists;

    if (!columnExists) {
      // Add the nextDueDate column if it doesn't exist
      await queryRunner.query(
        `ALTER TABLE "task" ADD COLUMN "nextDueDate" TIMESTAMP NULL`,
      );
      console.log('Added nextDueDate column to task table');
    } else {
      console.log('nextDueDate column already exists in task table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if nextDueDate column exists
    const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'task'
                AND column_name = 'nextDueDate'
            );
        `);

    const columnExists = result[0].exists;

    if (columnExists) {
      // Drop the nextDueDate column if it exists
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "nextDueDate"`);
      console.log('Removed nextDueDate column from task table');
    }
  }
}
