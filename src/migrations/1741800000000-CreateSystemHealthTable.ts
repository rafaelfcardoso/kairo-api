import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemHealthTable1741800000000
  implements MigrationInterface
{
  name = 'CreateSystemHealthTable1741800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "system_health" (
        "id" SERIAL NOT NULL, 
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "status" character varying NOT NULL,
        "system_load" numeric(5,2) NOT NULL,
        "memory_used_mb" integer NOT NULL,
        "memory_total_mb" integer NOT NULL,
        "memory_used_percent" numeric(5,2) NOT NULL,
        "database_connected" boolean NOT NULL,
        "database_size_mb" numeric(10,2),
        "database_connections" integer,
        "service_disruptions" integer NOT NULL DEFAULT 0,
        "recovery_attempts" integer NOT NULL DEFAULT 0,
        "successful_recoveries" integer NOT NULL DEFAULT 0,
        "uptime_seconds" integer NOT NULL,
        "additional_info" jsonb,
        CONSTRAINT "PK_system_health" PRIMARY KEY ("id")
      )
    `);

    // Create index on timestamp for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_system_health_timestamp" ON "system_health" ("timestamp")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_system_health_timestamp"`);
    await queryRunner.query(`DROP TABLE "system_health"`);
  }
}
