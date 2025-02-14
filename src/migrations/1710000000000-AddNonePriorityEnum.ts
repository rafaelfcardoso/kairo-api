import { QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class AddNonePriorityEnum1710000000000 extends BaseMigration {
  name = 'AddNonePriorityEnum1710000000000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Temporarily change existing medium values to low
    await queryRunner.query(`
      UPDATE "task" SET priority = 'low' WHERE priority = 'medium';
    `);

    // Drop the existing enum
    await queryRunner.query(`
      ALTER TABLE "task" ALTER COLUMN priority DROP DEFAULT;
      ALTER TABLE "task" ALTER COLUMN priority TYPE VARCHAR;
      DROP TYPE "task_priority_enum";
    `);

    // Create the new enum with 'none'
    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('none', 'low', 'medium', 'high');
    `);

    // Convert column back to enum and set default
    await queryRunner.query(`
      ALTER TABLE "task" ALTER COLUMN priority TYPE task_priority_enum USING priority::task_priority_enum;
      ALTER TABLE "task" ALTER COLUMN priority SET DEFAULT 'none';
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Revert none values to medium
    await queryRunner.query(`
      UPDATE "task" SET priority = 'medium' WHERE priority = 'none';
    `);

    // Drop the enum with 'none'
    await queryRunner.query(`
      ALTER TABLE "task" ALTER COLUMN priority DROP DEFAULT;
      ALTER TABLE "task" ALTER COLUMN priority TYPE VARCHAR;
      DROP TYPE "task_priority_enum";
    `);

    // Recreate the original enum
    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('low', 'medium', 'high');
    `);

    // Convert column back to enum and set default
    await queryRunner.query(`
      ALTER TABLE "task" ALTER COLUMN priority TYPE task_priority_enum USING priority::task_priority_enum;
      ALTER TABLE "task" ALTER COLUMN priority SET DEFAULT 'medium';
    `);
  }
}
