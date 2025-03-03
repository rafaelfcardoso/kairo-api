import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurrenceRuleColumn1741013788916
  implements MigrationInterface
{
  name = 'AddRecurrenceRuleColumn1741013788916';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if recurrenceRule column exists
    const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'task'
                AND column_name = 'recurrenceRule'
            );
        `);

    const columnExists = result[0].exists;

    if (!columnExists) {
      // Add the recurrenceRule column if it doesn't exist
      await queryRunner.query(
        `ALTER TABLE "task" ADD COLUMN "recurrenceRule" varchar NULL`,
      );
      console.log('Added recurrenceRule column to task table');
    } else {
      console.log('recurrenceRule column already exists in task table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if recurrenceRule column exists
    const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'task'
                AND column_name = 'recurrenceRule'
            );
        `);

    const columnExists = result[0].exists;

    if (columnExists) {
      // Drop the recurrenceRule column if it exists
      await queryRunner.query(
        `ALTER TABLE "task" DROP COLUMN "recurrenceRule"`,
      );
      console.log('Removed recurrenceRule column from task table');
    }
  }
}
