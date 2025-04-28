import { MigrationInterface, QueryRunner } from "typeorm";

export class SquashedSchema20250428190000 implements MigrationInterface {
    name = 'SquashedSchema20250428190000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // CREATE TABLE statements for fresh DB setup
        await queryRunner.query(`CREATE TABLE "user" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "email" character varying NOT NULL,
            "password" character varying NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_user_email" UNIQUE ("email")
        )`);
        await queryRunner.query(`CREATE TABLE "tag" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "userId" uuid,
            CONSTRAINT "PK_tag_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_tag_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
            CONSTRAINT "UQ_tag_userId_name" UNIQUE ("name", "userId")
        )`);
        await queryRunner.query(`CREATE TABLE "task" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" character varying NOT NULL,
            "reminderAt" TIMESTAMP,
            "reminderSentAt" TIMESTAMP,
            "userId" uuid,
            CONSTRAINT "PK_task_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_task_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE TABLE "task_tag" (
            "taskId" uuid NOT NULL,
            "tagId" uuid NOT NULL,
            CONSTRAINT "PK_task_tag" PRIMARY KEY ("taskId", "tagId"),
            CONSTRAINT "FK_task_tag_task" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_task_tag_tag" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE
        )`);
        // Add other CREATE TABLE statements for your schema as needed
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "task_tag"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "task"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tag"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
        // Drop other tables as needed
    }
}
