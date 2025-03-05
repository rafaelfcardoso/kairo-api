import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksRepository } from '../tasks/tasks.repository';
import { Logger } from '@nestjs/common';

/**
 * Script to fix malformed recurrence rules in existing tasks
 */
async function bootstrap() {
  const logger = new Logger('FixRecurrenceRules');
  logger.log('Starting recurrence rule fix script');

  try {
    // Create a NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the tasks repository
    const tasksRepository = app.get(TasksRepository);

    // Find all tasks with malformed recurrence rules
    const tasks = await tasksRepository
      .createQueryBuilder('task')
      .where('task.recurrenceRule LIKE :pattern', {
        pattern: '%FREQ=DAILYINTERVAL=%',
      })
      .getMany();

    logger.log(`Found ${tasks.length} tasks with malformed recurrence rules`);

    // Fix each task
    for (const task of tasks) {
      logger.log(`Fixing task ${task.id}: ${task.title}`);

      // Fix the recurrence rule
      task.recurrenceRule = task.recurrenceRule.replace(
        'FREQ=DAILYINTERVAL=',
        'FREQ=DAILY;INTERVAL=',
      );

      // Save the task
      await tasksRepository.save(task);

      logger.log(`Fixed task ${task.id}`);
    }

    logger.log('Finished fixing recurrence rules');

    // Close the application
    await app.close();
  } catch (error) {
    logger.error('Error fixing recurrence rules', error.stack);
    process.exit(1);
  }
}

// Run the script
bootstrap();
