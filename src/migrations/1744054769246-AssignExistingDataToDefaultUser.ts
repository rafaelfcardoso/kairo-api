import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignExistingDataToDefaultUser1744054769246
  implements MigrationInterface
{
  name = 'AssignExistingDataToDefaultUser1744054769246';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define default user details
    const defaultUserEmail = 'system@zenith.app';
    const defaultUserName = 'System Default';

    // 1. Insert the default user and get its ID
    const result = await queryRunner.query(
      `INSERT INTO "users" ("email", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
      [defaultUserEmail, defaultUserName],
    );

    if (!result || result.length === 0 || !result[0].id) {
      throw new Error('Failed to insert default user or retrieve its ID.');
    }
    const defaultUserId = result[0].id;

    console.log(`Default user created with ID: ${defaultUserId}`);

    // 2. Update existing records to use the default user ID
    // First, handle tables we know for sure have userId: project, task, focus_session
    const safeTablesByDefault = ['project', 'task', 'focus_session'];

    for (const table of safeTablesByDefault) {
      console.log(`Updating table: ${table}`);
      await queryRunner.query(
        `UPDATE "${table}" SET "userId" = $1 WHERE "userId" IS NULL`,
        [defaultUserId],
      );
    }

    // Handle tag table with a check first
    try {
      // Check if userId column exists in tag table
      const tagTableColumns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tag' AND column_name = 'userId'
      `);

      // If userId column exists in tag table, update it
      if (tagTableColumns && tagTableColumns.length > 0) {
        console.log('Updating tag table with userId column');
        await queryRunner.query(
          `UPDATE "tag" SET "userId" = $1 WHERE "userId" IS NULL`,
          [defaultUserId],
        );
      } else {
        // If userId column doesn't exist in tag table, add it
        console.log('Adding userId column to tag table');
        await queryRunner.query(`ALTER TABLE "tag" ADD "userId" uuid`);

        // Create index and foreign key constraint
        await queryRunner.query(
          `CREATE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "tag" ("userId") `,
        );
        await queryRunner.query(
          `ALTER TABLE "tag" ADD CONSTRAINT "FK_tag_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
        );

        // Then update all tags to use the default user
        await queryRunner.query(`UPDATE "tag" SET "userId" = $1`, [
          defaultUserId,
        ]);
      }
    } catch (error) {
      console.error('Error handling tag table:', error);
      // Continue with other tables even if tag table update fails
    }

    console.log('Finished assigning existing data to default user.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting this requires careful consideration. Options:
    // 1. Delete the default user (potential cascade issues if ON DELETE CASCADE was used elsewhere)
    // 2. Set userId back to NULL for records associated with the default user.
    // Choosing option 2 for simplicity, but data association will be lost.

    const defaultUserEmail = 'system@zenith.app';

    // Find the default user ID
    const userResult = await queryRunner.query(
      `SELECT id FROM "users" WHERE "email" = $1`,
      [defaultUserEmail],
    );

    if (userResult && userResult.length > 0) {
      const defaultUserId = userResult[0].id;
      console.log(`Found default user ID: ${defaultUserId} for rollback.`);

      // Set userId back to NULL for associated records
      const tablesToUpdate = ['project', 'task', 'focus_session'];
      for (const table of tablesToUpdate) {
        console.log(`Rolling back table: ${table}`);
        await queryRunner.query(
          `UPDATE "${table}" SET "userId" = NULL WHERE "userId" = $1`,
          [defaultUserId],
        );
      }

      // Handle tag table separately with a check
      try {
        const tagTableColumns = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'tag' AND column_name = 'userId'
        `);

        if (tagTableColumns && tagTableColumns.length > 0) {
          console.log('Rolling back tag table');
          await queryRunner.query(
            `UPDATE "tag" SET "userId" = NULL WHERE "userId" = $1`,
            [defaultUserId],
          );
        }
      } catch (error) {
        console.error('Error rolling back tag table:', error);
      }

      // Optionally delete the default user
      // await queryRunner.query(`DELETE FROM "users" WHERE "id" = $1`, [defaultUserId]);
      console.log(
        'Rollback: Set userId to NULL for records previously assigned to default user.',
      );
    } else {
      console.log('Rollback: Default user not found, skipping data update.');
    }

    // If you also deleted the user, uncomment the DELETE line above.
  }
}
