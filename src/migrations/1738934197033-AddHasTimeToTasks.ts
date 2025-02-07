import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHasTimeToTasks1738934197033 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "task"
            ADD COLUMN "hasTime" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "task"
            DROP COLUMN "hasTime"
        `);
    }

}
