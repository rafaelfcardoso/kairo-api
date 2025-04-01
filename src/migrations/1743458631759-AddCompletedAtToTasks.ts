import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletedAtToTasks1743458631759 implements MigrationInterface {
  name = 'AddCompletedAtToTasks1743458631759';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task" ADD "completedAt" TIMESTAMP`);
    // Set completedAt for existing completed tasks
    await queryRunner.query(`
            UPDATE "task"
            SET "completedAt" = "updatedAt"
            WHERE "status" = 'completed'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "completedAt"`);
  }
}
