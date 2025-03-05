import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class RemoveBlockRuleTable1741460000000 extends BaseMigration {
  name = 'RemoveBlockRuleTable1741460000000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Check if block_rule table exists before dropping it
    const tableExists = await this.tableExists(queryRunner, 'block_rule');
    if (tableExists) {
      // Drop the block_rule table
      await queryRunner.query(`DROP TABLE IF EXISTS "block_rule"`);
      console.log('block_rule table dropped successfully');
    } else {
      console.log('block_rule table does not exist, skipping drop');
    }
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Check if block_rule table already exists
    const tableExists = await this.tableExists(queryRunner, 'block_rule');
    if (!tableExists) {
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
      console.log('block_rule table recreated successfully');
    } else {
      console.log('block_rule table already exists, skipping creation');
    }
  }

  // Helper method to check if a table exists
  private async tableExists(
    queryRunner: QueryRunner,
    tableName: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `);
    return result[0].exists;
  }
}
