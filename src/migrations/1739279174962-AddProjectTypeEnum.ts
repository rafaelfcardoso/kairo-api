import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTypeEnum1739279174962 implements MigrationInterface {
  name = 'AddProjectTypeEnum1739279174962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the project_type enum
    await queryRunner.query(`
      CREATE TYPE "public"."project_type_enum" AS ENUM (
        'inbox',
        'regular',
        'archive'
      );
    `);

    // Add the type column with a default value
    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN "type" "public"."project_type_enum" NOT NULL DEFAULT 'regular';
    `);

    // Set the Inbox project type
    await queryRunner.query(`
      UPDATE "project"
      SET "type" = 'inbox'
      WHERE id = '569c363f-1934-4e69-b324-6c2fad28bc59';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the type column
    await queryRunner.query(`
      ALTER TABLE "project"
      DROP COLUMN "type";
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE "public"."project_type_enum";
    `);
  }
}
