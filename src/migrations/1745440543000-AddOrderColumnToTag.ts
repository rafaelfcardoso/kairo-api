import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderColumnToTag1745440543000 implements MigrationInterface {
  name = 'AddOrderColumnToTag1745440543000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'order' column to 'tag' table if it does not exist
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tag' AND column_name = 'order'
      );
    `);
    if (!columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "tag" ADD COLUMN "order" integer NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove 'order' column from 'tag' table if it exists
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tag' AND column_name = 'order'
      );
    `);
    if (columnExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "tag" DROP COLUMN "order"`);
    }
  }
}
