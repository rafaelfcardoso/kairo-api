import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class AddReminderColumnsToTask20250428180000 extends BaseMigration {
  name = 'AddReminderColumnsToTask20250428180000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN "reminderAt" TIMESTAMP NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN "reminderSentAt" TIMESTAMP NULL`,
    );
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "reminderSentAt"`);
    await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "reminderAt"`);
  }
}
