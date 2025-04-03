import { closeTestApp } from '../test-utils';

module.exports = async () => {
  console.log('Global teardown: closing test database connection');

  try {
    await closeTestApp();

    // Allow more time for connections to fully close
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 1000);
      // Ensure the timer doesn't keep the process alive
      timer.unref();
    });

    // Force cleanup of any remaining handles
    if (global.gc) {
      console.log('Running garbage collection...');
      try {
        global.gc();
      } catch (error) {
        console.error('Error during garbage collection:', error);
      }
    }
  } catch (error) {
    // Suppress connection-related errors during shutdown
    if (
      !error.message.includes('Cannot execute operation on') &&
      !error.message.includes('Connection terminated')
    ) {
      console.error('Error during global teardown:', error);
    }
  }
};
