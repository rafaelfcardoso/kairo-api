import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsArchivedToTag1744198558505 implements MigrationInterface {
  name = 'AddIsArchivedToTag1744198558505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if metadata column exists before trying to drop it
    const metadataExists = await queryRunner.hasColumn('task', 'metadata');
    if (metadataExists) {
      await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "metadata"`);
    }

    await queryRunner.query(
      `ALTER TABLE "tag" ADD "isArchived" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" SET DEFAULT uuid_generate_v4()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(`ALTER TABLE "tag" DROP COLUMN "isArchived"`);

    // Check if metadata column exists before trying to add it back
    const metadataExists = await queryRunner.hasColumn('task', 'metadata');
    if (!metadataExists) {
      await queryRunner.query(
        `ALTER TABLE "task" ADD "metadata" jsonb DEFAULT '{}'`,
      );
    }
  }
}
