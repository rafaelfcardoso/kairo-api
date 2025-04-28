import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesToJoinTables1745849293000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing indexes to join tables
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_tag_taskId" ON "task_tag" ("taskId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_tag_tagId" ON "task_tag" ("tagId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_closure_id_ancestor" ON "project_closure" ("id_ancestor")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_closure_id_descendant" ON "project_closure" ("id_descendant")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_tag_taskId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_tag_tagId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_closure_id_ancestor"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_closure_id_descendant"`);
    }
}
