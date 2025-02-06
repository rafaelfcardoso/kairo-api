import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureInboxProject1738362321119 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, ensure isSystem column exists
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'project' AND column_name = 'isSystem'
        ) THEN
          ALTER TABLE "project" ADD COLUMN "isSystem" boolean NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);

    // Check if Inbox project exists with the specific ID
    const inboxExists = await queryRunner.query(`
      SELECT COUNT(*) 
      FROM project 
      WHERE id = '569c363f-1934-4e69-b324-6c2fad28bc59'
    `);

    if (parseInt(inboxExists[0].count) === 0) {
      // Create the Inbox project with the specific ID
      await queryRunner.query(`
        INSERT INTO "project" (
          id, 
          name, 
          description, 
          "isSystem",
          color,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          '569c363f-1934-4e69-b324-6c2fad28bc59',
          'Caixa de entrada',
          'Tarefas não atribuídas a projetos',
          true,
          '#808080',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // Assign any tasks without a project to the Inbox
    await queryRunner.query(`
      UPDATE "task"
      SET "projectId" = '569c363f-1934-4e69-b324-6c2fad28bc59'
      WHERE "projectId" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // We don't want to delete the Inbox project or orphan tasks in the down migration
    // as it could cause data inconsistency. Instead, we'll just log a message.
    console.log(
      'Skipping down migration for Inbox project to prevent data loss',
    );
  }
}
