import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillUserInboxes1745000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all users
    const users = await queryRunner.query(`SELECT id FROM "users"`);
    for (const user of users) {
      // Check if Inbox exists for this user
      const existing = await queryRunner.query(
        `SELECT id FROM "project" WHERE name = 'Inbox' AND "userId" = $1`,
        [user.id],
      );
      if (existing.length === 0) {
        // Find max order for this user's root projects
        const result = await queryRunner.query(
          `SELECT MAX("order") as maxOrder FROM "project" WHERE "parentId" IS NULL AND "userId" = $1`,
          [user.id],
        );
        const nextOrder = (result[0]?.maxOrder ?? -1) + 1;
        // Insert Inbox project for this user
        await queryRunner.query(
          `INSERT INTO "project" (id, name, description, color, "parentId", "userId", "order", "createdAt", "updatedAt")
                     VALUES (gen_random_uuid(), 'Inbox', NULL, NULL, NULL, $1, $2, NOW(), NOW())`,
          [user.id, nextOrder],
        );
        // Optionally: log for debug
        console.log(`Created Inbox for user ${user.id}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Inboxes created by this migration
    await queryRunner.query(
      `DELETE FROM "project" WHERE name = 'Inbox' AND "userId" IS NOT NULL`,
    );
  }
}
