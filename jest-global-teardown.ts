import { closeTestApp } from './test/test-utils';

module.exports = async () => {
  console.log('Global teardown: closing test database connections');
  await closeTestApp();

  // Allow more time for connections to fully close
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Force cleanup of any remaining handles
  if (global.gc) {
    console.log('Running garbage collection...');
    global.gc();
  }
};
