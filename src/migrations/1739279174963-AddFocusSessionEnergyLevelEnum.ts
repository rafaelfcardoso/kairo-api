import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class AddFocusSessionEnergyLevelEnum1739279174963 extends BaseMigration {
  name = 'AddFocusSessionEnergyLevelEnum1739279174963';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Check if enum type exists
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'focus_session_energylevel_enum'
      );
    `);

    if (!enumExists[0].exists) {
      // Create the focus_session_energylevel_enum if it doesn't exist
      await queryRunner.query(`
        CREATE TYPE "public"."focus_session_energylevel_enum" AS ENUM (
          'low',
          'medium',
          'high'
        );
      `);
    }
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Check if enum type exists before trying to drop it
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'focus_session_energylevel_enum'
      );
    `);

    if (enumExists[0].exists) {
      // Drop the enum type if it exists
      await queryRunner.query(`
        DROP TYPE "public"."focus_session_energylevel_enum";
      `);
    }
  }
}
