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
    const tablesToUpdate = ['project', 'task', 'tag', 'focus_session'];

    for (const table of tablesToUpdate) {
      console.log(`Updating table: ${table}`);
      const updateResult = await queryRunner.query(
        `UPDATE "${table}" SET "userId" = $1 WHERE "userId" IS NULL`,
        [defaultUserId],
      );
      // Optional: Log update results (can be verbose)
      // console.log(`  -> Affected rows: ${updateResult?.[1]}`);
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
      const tablesToUpdate = ['project', 'task', 'tag', 'focus_session'];
      for (const table of tablesToUpdate) {
        console.log(`Rolling back table: ${table}`);
        await queryRunner.query(
          `UPDATE "${table}" SET "userId" = NULL WHERE "userId" = $1`,
          [defaultUserId],
        );
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
