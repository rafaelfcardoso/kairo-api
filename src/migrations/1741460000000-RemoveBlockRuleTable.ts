import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class RemoveBlockRuleTable1741460000000 extends BaseMigration {
  name = 'RemoveBlockRuleTable1741460000000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Drop the block_rule table
    await queryRunner.query(`DROP TABLE IF EXISTS "block_rule"`);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Re-create the block_rule table if needed to rollback
    // This is a simplified version, in a real scenario you would need to recreate
    // the table with all its columns and constraints
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "block_rule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" character varying NOT NULL,
        "target" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "schedule" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_block_rule" PRIMARY KEY ("id")
      )
    `);
  }
}
