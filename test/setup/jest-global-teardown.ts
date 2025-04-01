import { closeTestApp } from '../test-utils';

module.exports = async () => {
  console.log('Global teardown: closing test database connection');

  try {
    await closeTestApp();

    // Allow more time for connections to fully close
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 2000).unref();
    });

    // Force cleanup of any remaining handles
    if (global.gc) {
      console.log('Running garbage collection...');
      global.gc();
    }
  } catch (error) {
    console.error('Error during global teardown:', error);
    throw error;
  }
};
