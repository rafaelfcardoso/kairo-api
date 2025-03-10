import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlockEntities1712516400000 implements MigrationInterface {
  name = 'AddBlockEntities1712516400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create app_category table
    await queryRunner.query(`
      CREATE TABLE "app_category" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "systemId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_app_category_systemId" UNIQUE ("systemId"),
        CONSTRAINT "PK_app_category" PRIMARY KEY ("id")
      )
    `);

    // Create block_list table
    await queryRunner.query(`
      CREATE TABLE "block_list" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "isDefault" boolean NOT NULL DEFAULT false,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_block_list" PRIMARY KEY ("id")
      )
    `);

    // Create block_item table
    await queryRunner.query(`
      CREATE TYPE "public"."block_item_type_enum" AS ENUM('app', 'website', 'app_category')
    `);
    await queryRunner.query(`
      CREATE TABLE "block_item" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "public"."block_item_type_enum" NOT NULL,
        "identifier" character varying NOT NULL,
        "name" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "blockListId" uuid NOT NULL,
        "categoryId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_block_item" PRIMARY KEY ("id")
      )
    `);

    // Create join tables
    await queryRunner.query(`
      CREATE TABLE "block_list_schedules" (
        "blockListId" uuid NOT NULL,
        "scheduleId" uuid NOT NULL,
        CONSTRAINT "PK_block_list_schedules" PRIMARY KEY ("blockListId", "scheduleId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "schedule_direct_block_items" (
        "scheduleId" uuid NOT NULL,
        "blockItemId" uuid NOT NULL,
        CONSTRAINT "PK_schedule_direct_block_items" PRIMARY KEY ("scheduleId", "blockItemId")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "block_list" 
      ADD CONSTRAINT "FK_block_list_user" 
      FOREIGN KEY ("userId") 
      REFERENCES "user"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "block_item" 
      ADD CONSTRAINT "FK_block_item_block_list" 
      FOREIGN KEY ("blockListId") 
      REFERENCES "block_list"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "block_item" 
      ADD CONSTRAINT "FK_block_item_app_category" 
      FOREIGN KEY ("categoryId") 
      REFERENCES "app_category"("id") 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "block_list_schedules" 
      ADD CONSTRAINT "FK_block_list_schedules_block_list" 
      FOREIGN KEY ("blockListId") 
      REFERENCES "block_list"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "block_list_schedules" 
      ADD CONSTRAINT "FK_block_list_schedules_schedule" 
      FOREIGN KEY ("scheduleId") 
      REFERENCES "schedule"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "schedule_direct_block_items" 
      ADD CONSTRAINT "FK_schedule_direct_block_items_schedule" 
      FOREIGN KEY ("scheduleId") 
      REFERENCES "schedule"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "schedule_direct_block_items" 
      ADD CONSTRAINT "FK_schedule_direct_block_items_block_item" 
      FOREIGN KEY ("blockItemId") 
      REFERENCES "block_item"("id") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.query(
      `ALTER TABLE "schedule_direct_block_items" DROP CONSTRAINT "FK_schedule_direct_block_items_block_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_direct_block_items" DROP CONSTRAINT "FK_schedule_direct_block_items_schedule"`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_list_schedules" DROP CONSTRAINT "FK_block_list_schedules_schedule"`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_list_schedules" DROP CONSTRAINT "FK_block_list_schedules_block_list"`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_item" DROP CONSTRAINT "FK_block_item_app_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_item" DROP CONSTRAINT "FK_block_item_block_list"`,
    );
    await queryRunner.query(
      `ALTER TABLE "block_list" DROP CONSTRAINT "FK_block_list_user"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "schedule_direct_block_items"`);
    await queryRunner.query(`DROP TABLE "block_list_schedules"`);
    await queryRunner.query(`DROP TABLE "block_item"`);
    await queryRunner.query(`DROP TYPE "public"."block_item_type_enum"`);
    await queryRunner.query(`DROP TABLE "block_list"`);
    await queryRunner.query(`DROP TABLE "app_category"`);
  }
}
