import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTaskTagsTagToTaskTag1745469200000 implements MigrationInterface {
  name = 'RenameTaskTagsTagToTaskTag1745469200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename table if it exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_tags_tag'
      );
    `);
    if (tableExists[0].exists) {
      // Drop foreign keys first
      await queryRunner.query(`ALTER TABLE "task_tags_tag" DROP CONSTRAINT IF EXISTS "FK_task_tags_task"`);
      await queryRunner.query(`ALTER TABLE "task_tags_tag" DROP CONSTRAINT IF EXISTS "FK_task_tags_tag"`);
      // Rename table
      await queryRunner.query(`ALTER TABLE "task_tags_tag" RENAME TO "task_tag"`);
      // Re-add foreign keys
      await queryRunner.query(`ALTER TABLE "task_tag" ADD CONSTRAINT "FK_task_tag_task" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "task_tag" ADD CONSTRAINT "FK_task_tag_tag" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename table back if it exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_tag'
      );
    `);
    if (tableExists[0].exists) {
      // Drop foreign keys first
      await queryRunner.query(`ALTER TABLE "task_tag" DROP CONSTRAINT IF EXISTS "FK_task_tag_task"`);
      await queryRunner.query(`ALTER TABLE "task_tag" DROP CONSTRAINT IF EXISTS "FK_task_tag_tag"`);
      // Rename table back
      await queryRunner.query(`ALTER TABLE "task_tag" RENAME TO "task_tags_tag"`);
      // Re-add original foreign keys
      await queryRunner.query(`ALTER TABLE "task_tags_tag" ADD CONSTRAINT "FK_task_tags_task" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE`);
      await queryRunner.query(`ALTER TABLE "task_tags_tag" ADD CONSTRAINT "FK_task_tags_tag" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE`);
    }
  }
}
