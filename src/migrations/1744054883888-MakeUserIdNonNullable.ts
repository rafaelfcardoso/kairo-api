import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUserIdNonNullable1744054883888 implements MigrationInterface {
  name = 'MakeUserIdNonNullable1744054883888';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tag" DROP CONSTRAINT IF EXISTS "FK_tag_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" DROP CONSTRAINT IF EXISTS "FK_focus_session_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "FK_project_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "FK_task_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag" ADD CONSTRAINT "FK_tag_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" ADD CONSTRAINT "FK_focus_session_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_project_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
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
      `ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "FK_project_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" DROP CONSTRAINT IF EXISTS "FK_focus_session_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag" DROP CONSTRAINT IF EXISTS "FK_tag_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_request_log" ALTER COLUMN "requestId" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag" ADD CONSTRAINT "FK_tag_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_session" ADD CONSTRAINT "FK_focus_session_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_project_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ADD CONSTRAINT "FK_task_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }
}
