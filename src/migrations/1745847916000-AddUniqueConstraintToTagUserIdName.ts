import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToTagUserIdName1745847916000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add unique constraint on (userId, name) for tag table
        await queryRunner.query(`
            ALTER TABLE "tag"
            ADD CONSTRAINT "UQ_tag_userId_name" UNIQUE ("userId", "name")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove unique constraint
        await queryRunner.query(`
            ALTER TABLE "tag"
            DROP CONSTRAINT "UQ_tag_userId_name"
        `);
    }
}
