import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class AddBlockRuleTypeEnum1739279174964 extends BaseMigration {
  name = 'AddBlockRuleTypeEnum1739279174964';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Check if enum type exists
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'block_rule_type_enum'
      );
    `);

    if (!enumExists[0].exists) {
      // Create the block_rule_type_enum if it doesn't exist
      await queryRunner.query(`
        CREATE TYPE "public"."block_rule_type_enum" AS ENUM (
          'time_block',
          'recurring_block',
          'custom_block'
        );
      `);
    }
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Check if enum type exists before trying to drop it
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'block_rule_type_enum'
      );
    `);

    if (enumExists[0].exists) {
      // Drop the enum type if it exists
      await queryRunner.query(`
        DROP TYPE "public"."block_rule_type_enum";
      `);
    }
  }
}
