import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIsGoalFromTagTable1743380485000
  implements MigrationInterface
{
  name = 'RemoveIsGoalFromTagTable1743380485000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if isGoal column exists
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tag'
        AND column_name = 'isGoal'
      );
    `);

    const columnExists = result[0].exists;

    if (columnExists) {
      // Remove the isGoal column if it exists
      await queryRunner.query(`ALTER TABLE "tag" DROP COLUMN "isGoal"`);
      console.log('Removed isGoal column from tag table');
    } else {
      console.log('isGoal column does not exist in tag table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if isGoal column exists
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tag'
        AND column_name = 'isGoal'
      );
    `);

    const columnExists = result[0].exists;

    if (!columnExists) {
      // Add the isGoal column back if it doesn't exist
      await queryRunner.query(
        `ALTER TABLE "tag" ADD COLUMN "isGoal" BOOLEAN NOT NULL DEFAULT false`,
      );
      console.log('Added isGoal column to tag table');
    }
  }
}
