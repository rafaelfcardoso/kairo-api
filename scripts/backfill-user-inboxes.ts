import path from 'path';
import { config } from 'dotenv';
import dataSource from '../src/config/typeorm.config';

config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  // Get all users
  const users = await dataSource.query('SELECT id, email FROM "users"');
  let createdCount = 0;
  for (const user of users) {
    // Check if Inbox exists for this user
    const existing = await dataSource.query(
      'SELECT id FROM "project" WHERE name = $1 AND "userId" = $2',
      ['Inbox', user.id],
    );
    if (existing.length === 0) {
      // Find max order for this user's root projects
      const result = await dataSource.query(
        'SELECT MAX("order") as maxOrder FROM "project" WHERE "parentId" IS NULL AND "userId" = $1',
        [user.id],
      );
      const nextOrder = (result[0]?.maxOrder ?? -1) + 1;
      // Insert Inbox project for this user
      await dataSource.query(
        'INSERT INTO "project" (id, name, description, color, "parentId", "userId", "order", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, NULL, NULL, NULL, $2, $3, NOW(), NOW())',
        ['Inbox', user.id, nextOrder],
      );
      console.log(`Created Inbox for user ${user.email} (${user.id})`);
      createdCount++;
    }
  }
  if (createdCount === 0) {
    console.log('All users already have an Inbox project.');
  } else {
    console.log(`Created ${createdCount} missing Inbox projects.`);
  }
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Error running backfill:', err);
  process.exit(2);
});
