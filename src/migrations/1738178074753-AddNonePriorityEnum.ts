import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNonePriorityEnum1738178074753 implements MigrationInterface {
    name = 'AddNonePriorityEnum1738178074753'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "project_parentId_fkey"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "task_projectId_fkey"`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" DROP CONSTRAINT "task_tags_tag_taskId_fkey"`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" DROP CONSTRAINT "task_tags_tag_tagId_fkey"`);
        await queryRunner.query(`ALTER TABLE "project_closure" DROP CONSTRAINT "project_closure_id_ancestor_fkey"`);
        await queryRunner.query(`ALTER TABLE "project_closure" DROP CONSTRAINT "project_closure_id_descendant_fkey"`);
        await queryRunner.query(`CREATE TYPE "public"."focus_session_energylevel_enum" AS ENUM('low', 'medium', 'high')`);
        await queryRunner.query(`CREATE TABLE "focus_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP, "durationMinutes" integer NOT NULL DEFAULT '0', "energyLevel" "public"."focus_session_energylevel_enum" NOT NULL DEFAULT 'medium', "wasSuccessful" boolean NOT NULL DEFAULT false, "notes" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1275fae3091a5cb58e8d65d9c1b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."block_rule_type_enum" AS ENUM('website', 'application')`);
        await queryRunner.query(`CREATE TABLE "block_rule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" "public"."block_rule_type_enum" NOT NULL, "target" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "schedule" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_32f64777364e416053427a08d86" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "task_focus_sessions_focus_session" ("taskId" uuid NOT NULL, "focusSessionId" uuid NOT NULL, CONSTRAINT "PK_c5dfdd7eada029c70f672101095" PRIMARY KEY ("taskId", "focusSessionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_537323a8afda072e3a965a50f7" ON "task_focus_sessions_focus_session" ("taskId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c2c2903a729145001634483cb3" ON "task_focus_sessions_focus_session" ("focusSessionId") `);
        await queryRunner.query(`ALTER TYPE "public"."task_priority_enum" RENAME TO "task_priority_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."task_priority_enum" AS ENUM('none', 'low', 'medium', 'high')`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "priority" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "priority" TYPE "public"."task_priority_enum" USING "priority"::"text"::"public"."task_priority_enum"`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "priority" SET DEFAULT 'none'`);
        await queryRunner.query(`DROP TYPE "public"."task_priority_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_374509e2164bd1126522f424f6" ON "task_tags_tag" ("taskId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0e31820cdb45be62449b4f69c8" ON "task_tags_tag" ("tagId") `);
        await queryRunner.query(`CREATE INDEX "IDX_34c358da8b9f0fad392f90dbf4" ON "project_closure" ("id_ancestor") `);
        await queryRunner.query(`CREATE INDEX "IDX_885070eafa2e7a3c333cb30b3b" ON "project_closure" ("id_descendant") `);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_972cc84102e4234fb489536fccf" FOREIGN KEY ("parentId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" ADD CONSTRAINT "FK_374509e2164bd1126522f424f6f" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" ADD CONSTRAINT "FK_0e31820cdb45be62449b4f69c8c" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_focus_sessions_focus_session" ADD CONSTRAINT "FK_537323a8afda072e3a965a50f7f" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_focus_sessions_focus_session" ADD CONSTRAINT "FK_c2c2903a729145001634483cb35" FOREIGN KEY ("focusSessionId") REFERENCES "focus_session"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_closure" ADD CONSTRAINT "FK_34c358da8b9f0fad392f90dbf44" FOREIGN KEY ("id_ancestor") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_closure" ADD CONSTRAINT "FK_885070eafa2e7a3c333cb30b3bb" FOREIGN KEY ("id_descendant") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_closure" DROP CONSTRAINT "FK_885070eafa2e7a3c333cb30b3bb"`);
        await queryRunner.query(`ALTER TABLE "project_closure" DROP CONSTRAINT "FK_34c358da8b9f0fad392f90dbf44"`);
        await queryRunner.query(`ALTER TABLE "task_focus_sessions_focus_session" DROP CONSTRAINT "FK_c2c2903a729145001634483cb35"`);
        await queryRunner.query(`ALTER TABLE "task_focus_sessions_focus_session" DROP CONSTRAINT "FK_537323a8afda072e3a965a50f7f"`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" DROP CONSTRAINT "FK_0e31820cdb45be62449b4f69c8c"`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" DROP CONSTRAINT "FK_374509e2164bd1126522f424f6f"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_972cc84102e4234fb489536fccf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_885070eafa2e7a3c333cb30b3b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_34c358da8b9f0fad392f90dbf4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0e31820cdb45be62449b4f69c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_374509e2164bd1126522f424f6"`);
        await queryRunner.query(`CREATE TYPE "public"."task_priority_enum_old" AS ENUM('low', 'medium', 'high')`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "priority" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "priority" TYPE "public"."task_priority_enum_old" USING "priority"::"text"::"public"."task_priority_enum_old"`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "priority" SET DEFAULT 'medium'`);
        await queryRunner.query(`DROP TYPE "public"."task_priority_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."task_priority_enum_old" RENAME TO "task_priority_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2c2903a729145001634483cb3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_537323a8afda072e3a965a50f7"`);
        await queryRunner.query(`DROP TABLE "task_focus_sessions_focus_session"`);
        await queryRunner.query(`DROP TABLE "block_rule"`);
        await queryRunner.query(`DROP TYPE "public"."block_rule_type_enum"`);
        await queryRunner.query(`DROP TABLE "focus_session"`);
        await queryRunner.query(`DROP TYPE "public"."focus_session_energylevel_enum"`);
        await queryRunner.query(`ALTER TABLE "project_closure" ADD CONSTRAINT "project_closure_id_descendant_fkey" FOREIGN KEY ("id_descendant") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_closure" ADD CONSTRAINT "project_closure_id_ancestor_fkey" FOREIGN KEY ("id_ancestor") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" ADD CONSTRAINT "task_tags_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_tags_tag" ADD CONSTRAINT "task_tags_tag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "project_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
