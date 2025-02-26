import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIdToFocusSession1740589432291
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column already exists to avoid errors
    const hasColumn = await queryRunner.hasColumn('focus_session', 'projectId');
    if (!hasColumn) {
      // Add the projectId column
      await queryRunner.query(`
                ALTER TABLE "focus_session"
                ADD COLUMN "projectId" uuid NULL
            `);

      // Add foreign key constraint
      await queryRunner.query(`
                ALTER TABLE "focus_session"
                ADD CONSTRAINT "FK_focus_session_project"
                FOREIGN KEY ("projectId") REFERENCES "project"("id")
                ON DELETE SET NULL ON UPDATE CASCADE
            `);

      // Create an index for better performance
      await queryRunner.query(`
                CREATE INDEX "IDX_focus_session_project" ON "focus_session" ("projectId")
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if the column exists before attempting to remove it
    const hasColumn = await queryRunner.hasColumn('focus_session', 'projectId');
    if (hasColumn) {
      // Drop the index first
      await queryRunner.query(`
                DROP INDEX IF EXISTS "IDX_focus_session_project"
            `);

      // Drop the foreign key constraint
      await queryRunner.query(`
                ALTER TABLE "focus_session"
                DROP CONSTRAINT IF EXISTS "FK_focus_session_project"
            `);

      // Remove the column
      await queryRunner.query(`
                ALTER TABLE "focus_session"
                DROP COLUMN "projectId"
            `);
    }
  }
}
