import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class EnsureValidTaskStatuses1739279174961 extends BaseMigration {
  name = 'EnsureValidTaskStatuses1739279174961';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Update any remaining invalid status values to 'not_started'
    await queryRunner.query(`
      UPDATE "task"
      SET "status" = 'not_started'
      WHERE "status"::text NOT IN ('not_started', 'in_progress', 'blocked', 'completed');
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // This migration is not reversible as it's a data cleanup
    // We can't know what the original invalid values were
    console.log('No down migration needed for task status cleanup');
  }
}
