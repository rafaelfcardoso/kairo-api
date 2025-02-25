import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFocusSessionTables1740494148045
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if focus_session table exists
    const focusSessionTableExists = await queryRunner.hasTable('focus_session');
    if (!focusSessionTableExists) {
      // Create focus_session table
      await queryRunner.query(`
                CREATE TABLE "focus_session" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "startTime" TIMESTAMP NOT NULL,
                    "endTime" TIMESTAMP,
                    "durationMinutes" integer NOT NULL DEFAULT 0,
                    "energyLevel" varchar NOT NULL DEFAULT 'medium',
                    "wasSuccessful" boolean NOT NULL DEFAULT false,
                    "notes" text,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_focus_session" PRIMARY KEY ("id")
                )
            `);
    }

    // Check if junction table exists
    const junctionTableExists = await queryRunner.hasTable(
      'focus_session_tasks_task',
    );
    if (!junctionTableExists) {
      // Create junction table for many-to-many relationship between focus_session and task
      await queryRunner.query(`
                CREATE TABLE "focus_session_tasks_task" (
                    "focusSessionId" uuid NOT NULL,
                    "taskId" uuid NOT NULL,
                    CONSTRAINT "PK_focus_session_tasks_task" PRIMARY KEY ("focusSessionId", "taskId"),
                    CONSTRAINT "FK_focus_session_tasks_task_focus_session" FOREIGN KEY ("focusSessionId") 
                        REFERENCES "focus_session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT "FK_focus_session_tasks_task_task" FOREIGN KEY ("taskId") 
                        REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE
                )
            `);

      // Create indices for better performance
      await queryRunner.query(`
                CREATE INDEX "IDX_focus_session_tasks_task_focus_session" ON "focus_session_tasks_task" ("focusSessionId")
            `);
      await queryRunner.query(`
                CREATE INDEX "IDX_focus_session_tasks_task_task" ON "focus_session_tasks_task" ("taskId")
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (junction table first, then main table)
    await queryRunner.query(`DROP TABLE IF EXISTS "focus_session_tasks_task"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "focus_session"`);
  }
}
