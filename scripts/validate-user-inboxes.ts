import path from 'path';
import dataSource from '../src/config/typeorm.config';

// Load environment variables
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  // Query all users
  const users = await dataSource.query('SELECT id, email FROM "users"');
  let allOk = true;
  for (const user of users) {
    const inboxes = await dataSource.query(
      'SELECT id FROM "project" WHERE name = $1 AND "userId" = $2',
      ['Inbox', user.id]
    );
    if (inboxes.length === 0) {
      console.error(`User ${user.email} (${user.id}) has NO Inbox project!`);
      allOk = false;
    } else if (inboxes.length > 1) {
      console.error(`User ${user.email} (${user.id}) has MULTIPLE Inbox projects! Count: ${inboxes.length}`);
      allOk = false;
    }
  }
  if (allOk) {
    console.log('✅ All users have exactly one Inbox project.');
    process.exit(0);
  } else {
    console.error('❌ Some users are missing or have duplicate Inboxes.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error running validation:', err);
  process.exit(2);
});
