import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureValidTaskStatuses1739279174961
  implements MigrationInterface
{
  name = 'EnsureValidTaskStatuses1739279174961';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update any remaining invalid status values to 'not_started'
    await queryRunner.query(`
      UPDATE "task"
      SET "status" = 'not_started'
      WHERE "status"::text NOT IN ('not_started', 'in_progress', 'blocked', 'completed');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is not reversible as it's a data cleanup
    // We can't know what the original invalid values were
  }
}
