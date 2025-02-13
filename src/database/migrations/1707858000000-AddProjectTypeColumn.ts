import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTypeColumn1707858000000 implements MigrationInterface {
  name = 'AddProjectTypeColumn1707858000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First create the enum type
    await queryRunner.query(
      `CREATE TYPE "public"."project_type_enum" AS ENUM ('inbox', 'regular', 'archive')`,
    );

    // Add the type column with a default value
    await queryRunner.query(
      `ALTER TABLE "project" ADD "type" "public"."project_type_enum" NOT NULL DEFAULT 'regular'`,
    );

    // Update existing system projects to be inbox type if they exist
    await queryRunner.query(
      `UPDATE "project" SET "type" = 'inbox' WHERE "isSystem" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the type column
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "type"`);

    // Remove the enum type
    await queryRunner.query(`DROP TYPE "public"."project_type_enum"`);
  }
}
