import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurringTaskFields1740916550124 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new fields for recurring tasks
    await queryRunner.query(`
            ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "isRecurring" boolean DEFAULT false;
            ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "recurrencePattern" varchar NULL;
            ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "recurrenceDays" varchar NULL;
            ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "recurrenceTimeOfDay" varchar NULL;
            ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "recurrenceTime" varchar NULL;
            ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "recurringParentId" uuid NULL;
        `);

    // Log the migration
    console.log('Applied AddRecurringTaskFields migration');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the columns in reverse order
    await queryRunner.query(`
            ALTER TABLE "task" DROP COLUMN IF EXISTS "recurringParentId";
            ALTER TABLE "task" DROP COLUMN IF EXISTS "recurrenceTime";
            ALTER TABLE "task" DROP COLUMN IF EXISTS "recurrenceTimeOfDay";
            ALTER TABLE "task" DROP COLUMN IF EXISTS "recurrenceDays";
            ALTER TABLE "task" DROP COLUMN IF EXISTS "recurrencePattern";
            ALTER TABLE "task" DROP COLUMN IF EXISTS "isRecurring";
        `);

    // Log the rollback
    console.log('Rolled back AddRecurringTaskFields migration');
  }
}
