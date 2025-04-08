import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEntityAndRelations1744054661856
  implements MigrationInterface
{
  name = 'AddUserEntityAndRelations1744054661856';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying, "name" character varying, "avatarUrl" character varying, "googleId" character varying, "appleId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId"), CONSTRAINT "UQ_60cea0d80c39eedaaaf5e21f175" UNIQUE ("appleId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f382af58ab36057334fb262efd" ON "users" ("googleId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60cea0d80c39eedaaaf5e21f17" ON "users" ("appleId") `,
    );
    await queryRunner.query(`ALTER TABLE "project" ADD "userId" uuid`);
    await queryRunner.query(`ALTER TABLE "focus_session" ADD "userId" uuid`);
    await queryRunner.query(`ALTER TABLE "task" ADD "userId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3908f346f94fe3f23842a9ac04" ON "focus_session" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7c4b0d3b77eaf26f8b4da879e6" ON "project" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f316d3fe53497d4d8a2957db8b" ON "task" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_project_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" ADD CONSTRAINT "FK_focus_session_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ADD CONSTRAINT "FK_task_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "FK_task_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" DROP CONSTRAINT IF EXISTS "FK_focus_session_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "FK_project_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" DROP COLUMN IF EXISTS "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f316d3fe53497d4d8a2957db8b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c4b0d3b77eaf26f8b4da879e6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3908f346f94fe3f23842a9ac04"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
