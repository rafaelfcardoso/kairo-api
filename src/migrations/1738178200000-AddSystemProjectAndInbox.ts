import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemProjectAndInbox1738178200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add isSystem column
        await queryRunner.query(`
            ALTER TABLE "project" ADD COLUMN "isSystem" boolean NOT NULL DEFAULT false;
        `);

        // Create the Inbox project
        await queryRunner.query(`
            INSERT INTO "project" (id, name, description, "isSystem", color, "createdAt", "updatedAt")
            VALUES (
                '569c363f-1934-4e69-b324-6c2fad28bc59',
                'Caixa de entrada',
                'Tarefas não atribuídas a projetos',
                true,
                '#808080',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
        `);

        // Assign existing tasks without projects to the Inbox
        await queryRunner.query(`
            UPDATE "task"
            SET "projectId" = '569c363f-1934-4e69-b324-6c2fad28bc59'
            WHERE "projectId" IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove tasks from Inbox project
        await queryRunner.query(`
            UPDATE "task"
            SET "projectId" = NULL
            WHERE "projectId" = '569c363f-1934-4e69-b324-6c2fad28bc59';
        `);

        // Delete the Inbox project
        await queryRunner.query(`
            DELETE FROM "project"
            WHERE id = '569c363f-1934-4e69-b324-6c2fad28bc59';
        `);

        // Remove isSystem column
        await queryRunner.query(`
            ALTER TABLE "project" DROP COLUMN "isSystem";
        `);
    }
} 