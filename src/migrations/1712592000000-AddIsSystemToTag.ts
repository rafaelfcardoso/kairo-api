import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSystemToTag1712592000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tag" ADD COLUMN "isSystem" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tag" DROP COLUMN "isSystem"`);
  }
}
