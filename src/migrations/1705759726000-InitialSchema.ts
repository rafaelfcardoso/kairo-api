import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1705759726000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create TaskStatus enum
    await queryRunner.query(`
      CREATE TYPE "task_status_enum" AS ENUM ('todo', 'in_progress', 'pending', 'completed')
    `);

    // Create TaskPriority enum
    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('low', 'medium', 'high')
    `);

    // Create Project table
    await queryRunner.query(`
      CREATE TABLE "project" (
        "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        "name" character varying NOT NULL,
        "description" character varying,
        "isArchived" boolean NOT NULL DEFAULT false,
        "color" character varying,
        "order" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "parentId" uuid REFERENCES "project"("id")
      )
    `);

    // Create Tag table
    await queryRunner.query(`
      CREATE TABLE "tag" (
        "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        "name" character varying NOT NULL,
        "color" character(7) NOT NULL,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create Task table
    await queryRunner.query(`
      CREATE TABLE "task" (
        "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        "title" character varying NOT NULL,
        "description" character varying,
        "status" task_status_enum NOT NULL DEFAULT 'pending',
        "priority" task_priority_enum NOT NULL DEFAULT 'medium',
        "dueDate" TIMESTAMP,
        "estimatedMinutes" integer NOT NULL DEFAULT 0,
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "projectId" uuid REFERENCES "project"("id")
      )
    `);

    // Create Task-Tag join table
    await queryRunner.query(`
      CREATE TABLE "task_tags_tag" (
        "taskId" uuid REFERENCES "task"("id") ON DELETE CASCADE,
        "tagId" uuid REFERENCES "tag"("id") ON DELETE CASCADE,
        PRIMARY KEY ("taskId", "tagId")
      )
    `);

    // Create Project closure table
    await queryRunner.query(`
      CREATE TABLE "project_closure" (
        "id_ancestor" uuid REFERENCES "project"("id") ON DELETE CASCADE,
        "id_descendant" uuid REFERENCES "project"("id") ON DELETE CASCADE,
        PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_closure"`);
    await queryRunner.query(`DROP TABLE "task_tags_tag"`);
    await queryRunner.query(`DROP TABLE "task"`);
    await queryRunner.query(`DROP TABLE "tag"`);
    await queryRunner.query(`DROP TABLE "project"`);
    await queryRunner.query(`DROP TYPE "task_priority_enum"`);
    await queryRunner.query(`DROP TYPE "task_status_enum"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
} 