import { getTestApp } from './test/test-utils';

module.exports = async () => {
  console.log('Global setup: initializing test database connection');
  // This will initialize the app and database connection
  await getTestApp();

  // Give some time for the database connection to stabilize
  await new Promise((resolve) => setTimeout(resolve, 1000));
};
