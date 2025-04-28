import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMigrationIssues1744204141138 implements MigrationInterface {
  name = 'FixMigrationIssues1744204141138';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure metadata column doesn't exist in task table
    const taskMetadataExists = await queryRunner.hasColumn('task', 'metadata');
    if (taskMetadataExists) {
      console.log('Dropping metadata column from task table');
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "metadata"`);
    }

    // Ensure isArchived column exists in tag table
    const isArchivedColumnExists = await queryRunner.hasColumn(
      'tag',
      'isArchived',
    );
    if (!isArchivedColumnExists) {
      console.log('Adding isArchived column to tag table');
      await queryRunner.query(
        `ALTER TABLE "tag" ADD "isArchived" boolean NOT NULL DEFAULT false`,
      );
    }

    // Make sure isSystem doesn't exist on tag table (it was meant to be removed)
    const isSystemColumnExists = await queryRunner.hasColumn('tag', 'isSystem');
    if (isSystemColumnExists) {
      console.log('Removing isSystem column from tag table');
      await queryRunner.query(`ALTER TABLE "tag" DROP COLUMN "isSystem"`);
    }

    // Ensure UUID extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Fix requestId column in api_request_log if necessary
    try {
      console.log('Updating api_request_log.requestId column default value');
      await queryRunner.query(
        `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" DROP DEFAULT`,
      );
      await queryRunner.query(
        `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" SET DEFAULT uuid_generate_v4()`,
      );
    } catch (error) {
      console.log(
        'Error updating api_request_log table, it might not exist yet:',
        error.message,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need to undo these fixes as they ensure the correct state
  }
}
