import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SchedulerService } from './common/services/scheduler.service';

/**
 * Test script to manually trigger the scheduler's checkDueTasks method
 * to verify the needsReminder filter is working
 */
async function testReminderFilter() {
  const logger = new Logger('ReminderFilterTest');
  logger.log('Starting reminder filter test...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  try {
    const schedulerService = app.get(SchedulerService);

    // Manually trigger the checkDueTasks method
    logger.log('Manually triggering checkDueTasks...');
    await schedulerService.checkDueTasks();
    logger.log('checkDueTasks completed');

    // Wait a bit to see the logs
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.log('Reminder filter test completed!');
  } catch (error) {
    logger.error(`Test failed: ${error.message}`, error.stack);
  } finally {
    await app.close();
  }
}

// Run the test
testReminderFilter().catch((err) => {
  console.error('Failed to run test:', err);
  process.exit(1);
});
