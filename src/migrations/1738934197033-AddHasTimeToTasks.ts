import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class AddHasTimeToTasks1738934197033 extends BaseMigration {
  name = 'AddHasTimeToTasks1738934197033';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task"
      ADD COLUMN "hasTime" boolean NOT NULL DEFAULT false
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task"
      DROP COLUMN "hasTime"
    `);
  }
}
