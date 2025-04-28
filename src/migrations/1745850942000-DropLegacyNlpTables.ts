import { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacyNlpTables1745850942000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop legacy NLP tables if they exist
        await queryRunner.query(`DROP TABLE IF EXISTS "nlp_feedback" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "nlp_model_performance" CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Optionally, recreate the tables (structure only, no data)
        await queryRunner.query(`CREATE TABLE "nlp_feedback" (
            id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
            type character varying NOT NULL,
            "originalInput" jsonb NOT NULL,
            "systemOutput" jsonb NOT NULL,
            "correctedOutput" jsonb,
            "userId" character varying,
            "isProcessed" boolean DEFAULT false NOT NULL,
            "feedbackText" character varying,
            "modelVersion" character varying,
            "confidenceScore" double precision,
            "processingTimeMs" integer,
            "relatedEntityId" character varying,
            "relatedEntityType" character varying,
            "wasUseful" boolean,
            "improvementSuggestion" text,
            "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
            "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
        )`);
        await queryRunner.query(`CREATE TABLE "nlp_model_performance" (
            id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
            "modelName" character varying NOT NULL,
            "version" character varying NOT NULL,
            "accuracy" double precision,
            "precision" double precision,
            "recall" double precision,
            "f1Score" double precision,
            "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
            "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
        )`);
    }
}
