import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class CreateUserBlockSettingsAndSchedules1741450000000 extends BaseMigration {
  name = 'CreateUserBlockSettingsAndSchedules1741450000000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Create block_type_enum if it doesn't exist
    const blockTypeEnumExists = await this.enumExists(
      queryRunner,
      'block_type_enum',
    );
    if (!blockTypeEnumExists) {
      await queryRunner.query(`
        CREATE TYPE "block_type_enum" AS ENUM ('app', 'website');
      `);
    }

    // Create user table
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user" PRIMARY KEY ("id")
      );
    `);

    // Create block_setting table
    await queryRunner.query(`
      CREATE TABLE "block_setting" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "block_type_enum" NOT NULL,
        "identifier" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_block_setting" PRIMARY KEY ("id"),
        CONSTRAINT "FK_block_setting_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    // Create schedule table
    await queryRunner.query(`
      CREATE TABLE "schedule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "startHour" integer NOT NULL,
        "startMinute" integer NOT NULL,
        "endHour" integer NOT NULL,
        "endMinute" integer NOT NULL,
        "days" integer array NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedule" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedule_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "block_setting"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "block_type_enum"`);
  }
}
