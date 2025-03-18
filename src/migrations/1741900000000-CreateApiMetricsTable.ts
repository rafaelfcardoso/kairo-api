import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiMetricsTable1741900000000 implements MigrationInterface {
  name = 'CreateApiMetricsTable1741900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create API request log table
    await queryRunner.query(`
      CREATE TABLE "api_request_log" (
        "id" SERIAL NOT NULL,
        "requestId" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "endpoint" character varying NOT NULL,
        "method" character varying NOT NULL,
        "version" character varying NOT NULL,
        "statusCode" integer NOT NULL,
        "responseTime" integer NOT NULL,
        "userId" character varying,
        "userAgent" character varying,
        "ipAddress" character varying,
        "requestBody" jsonb,
        "requestQuery" jsonb,
        "responseSize" integer,
        "errorCode" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_request_log" PRIMARY KEY ("id")
      )
    `);

    // Create API metrics table for aggregated data
    await queryRunner.query(`
      CREATE TABLE "api_metrics" (
        "id" SERIAL NOT NULL,
        "endpoint" character varying NOT NULL,
        "method" character varying NOT NULL,
        "version" character varying NOT NULL,
        "date" date NOT NULL,
        "hour" integer NOT NULL,
        "requestCount" integer NOT NULL DEFAULT 0,
        "successCount" integer NOT NULL DEFAULT 0,
        "errorCount" integer NOT NULL DEFAULT 0,
        "avgResponseTime" real NOT NULL DEFAULT 0,
        "p95ResponseTime" real,
        "p99ResponseTime" real,
        "minResponseTime" integer,
        "maxResponseTime" integer,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_metrics" PRIMARY KEY ("id")
      )
    `);

    // Create unique index on api_metrics for endpoint+method+version+date+hour
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_api_metrics_endpoint_method_version_date_hour" 
      ON "api_metrics" ("endpoint", "method", "version", "date", "hour")
    `);

    // Create indexes for request log
    await queryRunner.query(`
      CREATE INDEX "IDX_api_request_log_endpoint" ON "api_request_log" ("endpoint")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_api_request_log_createdAt" ON "api_request_log" ("createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_api_request_log_userId" ON "api_request_log" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_api_request_log_statusCode" ON "api_request_log" ("statusCode")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_api_request_log_statusCode"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_api_request_log_userId"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_api_request_log_createdAt"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_api_request_log_endpoint"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_api_metrics_endpoint_method_version_date_hour"
    `);
    await queryRunner.query(`
      DROP TABLE "api_metrics"
    `);
    await queryRunner.query(`
      DROP TABLE "api_request_log"
    `);
  }
}
