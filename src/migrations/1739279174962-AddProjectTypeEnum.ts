import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class AddProjectTypeEnum1739279174962 extends BaseMigration {
  name = 'AddProjectTypeEnum1739279174962';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Check if enum type exists
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'project_type_enum'
      );
    `);

    if (!enumExists[0].exists) {
      // Create the project_type enum if it doesn't exist
      await queryRunner.query(`
        CREATE TYPE "public"."project_type_enum" AS ENUM (
          'inbox',
          'regular',
          'archive'
        );
      `);
    }

    // Check if type column exists
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project' AND column_name = 'type'
      );
    `);

    if (!columnExists[0].exists) {
      // Add the type column with a default value if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE "project"
        ADD COLUMN "type" "public"."project_type_enum" NOT NULL DEFAULT 'regular';
      `);
    }

    // Set the Inbox project type for system projects
    await queryRunner.query(`
      UPDATE "project"
      SET "type" = 'inbox'
      WHERE "isSystem" = true;
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Check if type column exists before trying to drop it
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project' AND column_name = 'type'
      );
    `);

    if (columnExists[0].exists) {
      // Drop the type column if it exists
      await queryRunner.query(`
        ALTER TABLE "project"
        DROP COLUMN "type";
      `);
    }

    // Check if enum type exists before trying to drop it
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'project_type_enum'
      );
    `);

    if (enumExists[0].exists) {
      // Drop the enum type if it exists
      await queryRunner.query(`
        DROP TYPE "public"."project_type_enum";
      `);
    }
  }
}
