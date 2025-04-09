import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIsSystemFromTag1744198367443 implements MigrationInterface {
  name = 'RemoveIsSystemFromTag1744198367443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "metadata"`);
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
    await queryRunner.query(
      `ALTER TABLE "task" ADD "metadata" jsonb DEFAULT '{}'`,
    );
  }
}
