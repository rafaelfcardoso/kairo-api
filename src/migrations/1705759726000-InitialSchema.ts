import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1705759726000 implements MigrationInterface {
  name = 'InitialSchema1705759726000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First ensure uuid-ossp extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum type if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_enum') THEN
          CREATE TYPE "task_status_enum" AS ENUM ('todo', 'in_progress', 'pending', 'completed');
        END IF;
      END $$;
    `);

    // Create tables if they don't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying,
        "status" "task_status_enum" NOT NULL DEFAULT 'todo',
        "dueDate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "projectId" uuid,
        CONSTRAINT "PK_task" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "isArchived" boolean NOT NULL DEFAULT false,
        "isSystem" boolean NOT NULL DEFAULT false,
        "color" character varying,
        "order" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "parentId" uuid,
        CONSTRAINT "PK_project" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tag" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "color" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tag" PRIMARY KEY ("id")
      );
    `);

    // Add foreign key constraints if they don't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_task_project'
        ) THEN
          ALTER TABLE "task" 
          ADD CONSTRAINT "FK_task_project" 
          FOREIGN KEY ("projectId") 
          REFERENCES "project"("id") 
          ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_project_parent'
        ) THEN
          ALTER TABLE "project" 
          ADD CONSTRAINT "FK_project_parent" 
          FOREIGN KEY ("parentId") 
          REFERENCES "project"("id") 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "FK_task_project";
      ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "FK_project_parent";
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "tag"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "task_status_enum"`);
  }
}
