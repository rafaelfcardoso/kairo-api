import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';

export class AddTaskTagsTable1739279174963 extends BaseMigration {
  name = 'AddTaskTagsTable1739279174963';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Check if the junction table already exists
    const taskTagsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_tags_tag'
      );
    `);

    if (!taskTagsTableExists[0].exists) {
      // Create the junction table
      await queryRunner.query(`
        CREATE TABLE "task_tags_tag" (
          "taskId" uuid NOT NULL,
          "tagId" uuid NOT NULL,
          CONSTRAINT "PK_task_tags" PRIMARY KEY ("taskId", "tagId")
        );
      `);

      // Add foreign key constraints
      await queryRunner.query(`
        ALTER TABLE "task_tags_tag" 
        ADD CONSTRAINT "FK_task_tags_task" 
        FOREIGN KEY ("taskId") 
        REFERENCES "task"("id") 
        ON DELETE CASCADE;
      `);

      await queryRunner.query(`
        ALTER TABLE "task_tags_tag" 
        ADD CONSTRAINT "FK_task_tags_tag" 
        FOREIGN KEY ("tagId") 
        REFERENCES "tag"("id") 
        ON DELETE CASCADE;
      `);
    }
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "task_tags_tag" DROP CONSTRAINT IF EXISTS "FK_task_tags_task";
      ALTER TABLE "task_tags_tag" DROP CONSTRAINT IF EXISTS "FK_task_tags_tag";
    `);

    // Drop the junction table
    await queryRunner.query(`DROP TABLE IF EXISTS "task_tags_tag"`);
  }
}
