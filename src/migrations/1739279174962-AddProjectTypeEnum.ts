import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTypeEnum1739279174962 implements MigrationInterface {
  name = 'AddProjectTypeEnum1739279174962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, ensure this migration hasn't been run before
    const migrationExists = await queryRunner.query(
      `
      SELECT COUNT(*) 
      FROM migrations 
      WHERE name = $1
      `,
      [this.name],
    );

    if (parseInt(migrationExists[0].count) > 0) {
      console.log(`Migration ${this.name} has already been applied`);
      return;
    }

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

    // Record this migration in the migrations table
    await queryRunner.query(
      `
      INSERT INTO migrations (timestamp, name)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING;
      `,
      [1739279174962, this.name],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

    // Remove this migration from the migrations table
    await queryRunner.query(
      `
      DELETE FROM migrations
      WHERE name = $1;
      `,
      [this.name],
    );
  }
}
