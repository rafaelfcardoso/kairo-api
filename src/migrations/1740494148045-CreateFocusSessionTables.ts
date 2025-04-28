import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFocusSessionTables1740494148045
  implements MigrationInterface
{
  name = 'CreateFocusSessionTables1740494148045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create energy level enum type if it doesn't exist
    const energyLevelEnumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE pg_type.typname = 'focus_session_energylevel_enum' 
        AND pg_namespace.nspname = 'public'
      );
    `);

    if (!energyLevelEnumExists[0].exists) {
      await queryRunner.query(`
        CREATE TYPE "focus_session_energylevel_enum" AS ENUM('low', 'medium', 'high')
      `);
    }

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
                    "energyLevel" "focus_session_energylevel_enum" NOT NULL DEFAULT 'medium',
                    "wasSuccessful" boolean NOT NULL DEFAULT false,
                    "notes" text,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_focus_session" PRIMARY KEY ("id")
                )
            `);
    }

    // Check if junction table exists
    const junctionTableExists = await queryRunner.hasTable(
      'task_focus_sessions_focus_session',
    );
    if (!junctionTableExists) {
      // Create junction table with the correct name
      await queryRunner.query(`
        CREATE TABLE "task_focus_sessions_focus_session" (
            "taskId" uuid NOT NULL,
            "focusSessionId" uuid NOT NULL,
            CONSTRAINT "PK_task_focus_sessions" PRIMARY KEY ("taskId", "focusSessionId"),
            CONSTRAINT "FK_task_focus_sessions_task" FOREIGN KEY ("taskId") 
                REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "FK_task_focus_sessions_focus_session" FOREIGN KEY ("focusSessionId") 
                REFERENCES "focus_session"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      // Create indices with corrected table name
      await queryRunner.query(`
        CREATE INDEX "IDX_task_focus_sessions_task" ON "task_focus_sessions_focus_session" ("taskId")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_task_focus_sessions_focus_session" ON "task_focus_sessions_focus_session" ("focusSessionId")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table with the correct name
    await queryRunner.query(
      `DROP TABLE IF EXISTS "task_focus_sessions_focus_session"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "focus_session"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "focus_session_energylevel_enum"`,
    );
  }
}
