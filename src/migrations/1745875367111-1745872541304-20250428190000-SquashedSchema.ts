import { MigrationInterface, QueryRunner } from "typeorm";

export class 174587254130420250428190000SquashedSchema1745875367111 implements MigrationInterface {
    name = '174587254130420250428190000SquashedSchema1745875367111'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "api_request_log"
            ALTER COLUMN "requestId" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "api_request_log"
            ALTER COLUMN "requestId"
            SET DEFAULT uuid_generate_v4()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "api_request_log"
            ALTER COLUMN "requestId" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "api_request_log"
            ALTER COLUMN "requestId"
            SET DEFAULT uuid_generate_v4()
        `);
    }

}
