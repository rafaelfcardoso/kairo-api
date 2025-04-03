# iOS Push Notification Implementation for Zenith API

This document outlines the architecture and implementation steps for adding iOS push notification support to the Zenith API. The implementation follows Domain-Driven Design principles and leverages the existing notification domain services.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Implementation](#current-implementation)
3. [Implementation Steps](#implementation-steps)
4. [Data Models](#data-models)
5. [Infrastructure Components](#infrastructure-components)
6. [API Endpoints](#api-endpoints)
7. [Testing](#testing)
8. [Deployment Considerations](#deployment-considerations)
9. [Troubleshooting](#troubleshooting)

## Architecture Overview

The push notification system will follow a clean architecture approach with clear separation of concerns:

1. **Domain Layer**: Contains the notification business logic (already implemented)
2. **Application Layer**: Coordinates the notification delivery process
3. **Infrastructure Layer**: Handles device registration and communication with Apple Push Notification Service (APNS)
4. **Interface Layer**: Provides API endpoints for device registration

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│    Domain Layer     │    │  Application Layer   │    │ Infrastructure Layer │
│                     │    │                      │    │                      │
│ NotificationDomain  │───►│ NotificationService  │───►│ PushNotification     │
│ Service             │    │                      │    │ Service              │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                                             │
                                                             ▼
                                                      ┌─────────────┐
                                                      │    APNS     │
                                                      └─────────────┘
```

## Current Implementation

Currently, the Zenith API includes a `NotificationDomainService` that:

- Determines when notifications should be triggered based on task properties
- Generates notification content (title, message, data)
- Handles different types of notifications (standard tasks, reminders)

This domain service doesn't directly send notifications but provides the content and logic for when they should be sent.

## Implementation Steps

### 1. Set Up Apple Developer Account

1. Ensure you have an Apple Developer account
2. Create an App ID with Push Notification capability
3. Generate push notification certificates (development and production)
4. Convert certificates to .p8 format and note the Key ID

### 2. Create Device Registration Entity

Create a new entity to store device tokens:

```typescript
// src/notification/entities/device-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity()
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column({ default: 'ios' })
  platform: string;

  @Column({ nullable: true })
  deviceName: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.deviceTokens)
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastUsed: Date;
}
```

### 3. Create Push Notification Infrastructure Service

This service will handle communication with APNS:

```typescript
// src/notification/services/push-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as apn from 'apn';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';
import { NotificationContent } from '../../tasks/notification.domain.service';

@Injectable()
export class PushNotificationService {
  private provider: apn.Provider;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
  ) {
    // Initialize the APN provider
    this.provider = new apn.Provider({
      token: {
        key: this.configService.get<string>('APNS_KEY_PATH'),
        keyId: this.configService.get<string>('APNS_KEY_ID'),
        teamId: this.configService.get<string>('APNS_TEAM_ID'),
      },
      production: this.configService.get<string>('NODE_ENV') === 'production',
    });
  }

  /**
   * Send push notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    content: NotificationContent,
  ): Promise<boolean> {
    try {
      // Get active device tokens for the user
      const deviceTokens = await this.deviceTokenRepository.find({
        where: {
          userId,
          isActive: true,
          platform: 'ios',
        },
      });

      if (!deviceTokens.length) {
        this.logger.log(`No active iOS devices found for user ${userId}`);
        return false;
      }

      // Create APNS notification
      const notification = new apn.Notification();
      notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour
      notification.badge = 1;
      notification.sound = 'ping.aiff';
      notification.alert = {
        title: content.title,
        body: content.message,
      };
      notification.payload = {
        ...content.data,
        notificationId: Date.now().toString(),
      };
      notification.topic = this.configService.get<string>('IOS_BUNDLE_ID');

      // Send to all devices
      const tokens = deviceTokens.map((device) => device.token);
      const result = await this.provider.send(notification, tokens);

      // Update last used timestamp for successful tokens
      if (result.sent.length > 0) {
        await this.deviceTokenRepository.update(
          { token: { $in: result.sent.map((item) => item.device) } },
          { lastUsed: new Date() },
        );
      }

      // Handle failed tokens (e.g., mark inactive if token is invalid)
      for (const failed of result.failed) {
        if (
          failed.response &&
          (failed.response.reason === 'BadDeviceToken' ||
            failed.response.reason === 'Unregistered')
        ) {
          await this.deviceTokenRepository.update(
            { token: failed.device },
            { isActive: false },
          );
        }
      }

      this.logger.log(
        `Push notification sent to user ${userId}: ${result.sent.length} successful, ${result.failed.length} failed`,
      );
      return result.sent.length > 0;
    } catch (error) {
      this.logger.error(
        `Error sending push notification to user ${userId}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    content: NotificationContent,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.sendNotificationToUser(userId, content);
    }
  }

  /**
   * Register a new device token
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    deviceName?: string,
  ): Promise<DeviceToken> {
    // Check if token already exists
    let deviceToken = await this.deviceTokenRepository.findOne({
      where: { token, userId },
    });

    if (deviceToken) {
      // Update existing token
      deviceToken.isActive = true;
      deviceToken.deviceName = deviceName || deviceToken.deviceName;
      return this.deviceTokenRepository.save(deviceToken);
    }

    // Create new token
    deviceToken = new DeviceToken();
    deviceToken.userId = userId;
    deviceToken.token = token;
    deviceToken.deviceName = deviceName;
    deviceToken.platform = 'ios';
    deviceToken.isActive = true;

    return this.deviceTokenRepository.save(deviceToken);
  }

  /**
   * Deactivate a device token
   */
  async deactivateDeviceToken(token: string): Promise<void> {
    await this.deviceTokenRepository.update({ token }, { isActive: false });
  }
}
```

### 4. Create Notification Application Service

This service will coordinate notification delivery:

```typescript
// src/notification/services/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationDomainService,
  NotificationContent,
} from '../../tasks/notification.domain.service';
import { PushNotificationService } from './push-notification.service';
import { Task } from '../../tasks/tasks.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private notificationDomainService: NotificationDomainService,
    private pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Process and send a task notification
   */
  async sendTaskNotification(task: Task): Promise<boolean> {
    try {
      // Get user ID from task (assuming tasks have userId or can be related to a user)
      const userId = task.userId || (task.project && task.project.userId);

      if (!userId) {
        this.logger.error(
          `Cannot send notification for task ${task.id}: No user associated`,
        );
        return false;
      }

      // Generate notification content using domain service
      const content =
        this.notificationDomainService.generateNotificationContent(task);

      // Send push notification
      return await this.pushNotificationService.sendNotificationToUser(
        userId,
        content,
      );
    } catch (error) {
      this.logger.error(
        `Error sending task notification for task ${task.id}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Process and send notifications for multiple tasks
   */
  async sendTaskNotifications(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await this.sendTaskNotification(task);
    }
  }

  /**
   * Send a custom notification to a user
   */
  async sendCustomNotification(
    userId: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    const content: NotificationContent = {
      title,
      message,
      data,
    };

    return await this.pushNotificationService.sendNotificationToUser(
      userId,
      content,
    );
  }
}
```

### 5. Create Device Registration Controller

```typescript
// src/notification/controllers/device-registration.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PushNotificationService } from '../services/push-notification.service';
import { DeviceRegistrationDto } from '../dto/device-registration.dto';

@ApiTags('notifications')
@Controller('device-registration')
export class DeviceRegistrationController {
  constructor(private pushNotificationService: PushNotificationService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Device token registered successfully',
  })
  async registerDevice(
    @Request() req,
    @Body() deviceRegistrationDto: DeviceRegistrationDto,
  ) {
    const userId = req.user.id;
    const deviceToken = await this.pushNotificationService.registerDeviceToken(
      userId,
      deviceRegistrationDto.token,
      deviceRegistrationDto.deviceName,
    );

    return {
      success: true,
      message: 'Device registered successfully',
      data: {
        id: deviceToken.id,
      },
    };
  }

  @Delete(':token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a device token' })
  @ApiResponse({
    status: 200,
    description: 'Device token deactivated successfully',
  })
  async deactivateDevice(@Request() req, @Param('token') token: string) {
    await this.pushNotificationService.deactivateDeviceToken(token);

    return {
      success: true,
      message: 'Device deactivated successfully',
    };
  }
}
```

### 6. Create Notification Module

```typescript
// src/notification/notification.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { PushNotificationService } from './services/push-notification.service';
import { NotificationService } from './services/notification.service';
import { DeviceRegistrationController } from './controllers/device-registration.controller';
import { NotificationDomainService } from '../tasks/notification.domain.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceToken])],
  controllers: [DeviceRegistrationController],
  providers: [
    PushNotificationService,
    NotificationService,
    NotificationDomainService,
  ],
  exports: [PushNotificationService, NotificationService],
})
export class NotificationModule {}
```

### 7. Update the Task Service to Trigger Notifications

```typescript
// Update the task service to trigger notifications when needed
// src/tasks/tasks.service.ts (partial example)

// Import the notification service
import { NotificationService } from '../notification/services/notification.service';

// Inject the notification service in the constructor
constructor(
  // ... other dependencies
  private notificationService: NotificationService
) {}

// Example: Trigger notification when a task becomes due
async checkAndNotifyDueTasks(): Promise<void> {
  const dueTasks = await this.taskRepository.findDueTasks();

  for (const task of dueTasks) {
    if (task.needsReminder) {
      await this.notificationService.sendTaskNotification(task);
    }
  }
}
```

### 8. Add a Background Process for Sending Due Reminders

```typescript
// src/tasks/schedulers/task-reminder.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksRepository } from '../tasks.repository';
import { NotificationService } from '../../notification/services/notification.service';
import { Task } from '../tasks.entity';

@Injectable()
export class TaskReminderScheduler {
  private readonly logger = new Logger(TaskReminderScheduler.name);

  constructor(
    private tasksRepository: TasksRepository,
    private notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSendReminders() {
    this.logger.debug('Checking for tasks that need reminders...');

    try {
      // Find tasks that are due now and need reminders
      const now = new Date();
      const dueTasks = await this.tasksRepository.find({
        where: {
          dueDate: {
            // Tasks due in the last minute
            $gte: new Date(now.getTime() - 60000),
            $lt: now,
          },
          needsReminder: true,
          status: { $ne: 'completed' },
          isArchived: false,
        },
      });

      this.logger.debug(`Found ${dueTasks.length} tasks that need reminders`);

      // Send notifications for each task
      for (const task of dueTasks) {
        await this.notificationService.sendTaskNotification(task);
      }
    } catch (error) {
      this.logger.error('Error checking and sending reminders', error.stack);
    }
  }
}
```

## Data Models

### Device Token DTO

```typescript
// src/notification/dto/device-registration.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceRegistrationDto {
  @ApiProperty({
    description: 'The device token for push notifications',
    example: 'a1b2c3d4e5f6g7h8i9j0...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Device name (optional)',
    example: "John's iPhone",
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceName?: string;
}
```

## Infrastructure Components

### Required Dependencies

Add the following to your package.json:

```json
{
  "dependencies": {
    "apn": "^2.2.0"
  }
}
```

### Environment Variables

Add these to your .env file:

```
# Apple Push Notification Service (APNS) Configuration
APNS_KEY_PATH=./certs/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX
IOS_BUNDLE_ID=com.zenithapp.mobile
```

## API Endpoints

### Device Registration

- **POST /api/device-registration**

  - Register a device token for push notifications
  - Requires authentication
  - Request body: `{ "token": "device_token_string", "deviceName": "optional_name" }`

- **DELETE /api/device-registration/:token**
  - Deactivate a device token
  - Requires authentication

## Testing

### Unit Tests

Create unit tests for the push notification service:

```typescript
// src/notification/services/push-notification.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PushNotificationService } from './push-notification.service';
import { DeviceToken } from '../entities/device-token.entity';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockDeviceTokenRepository;
  let mockConfigService;

  beforeEach(async () => {
    mockDeviceTokenRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        switch (key) {
          case 'APNS_KEY_PATH':
            return './path/to/key.p8';
          case 'APNS_KEY_ID':
            return 'KEY_ID';
          case 'APNS_TEAM_ID':
            return 'TEAM_ID';
          case 'NODE_ENV':
            return 'test';
          case 'IOS_BUNDLE_ID':
            return 'com.zenithapp.test';
          default:
            return undefined;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: getRepositoryToken(DeviceToken),
          useValue: mockDeviceTokenRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);

    // Mock the APN provider
    service['provider'] = {
      send: jest.fn().mockResolvedValue({
        sent: [{ device: 'token1' }],
        failed: [],
      }),
    };
  });

  it('should register a new device token', async () => {
    mockDeviceTokenRepository.findOne.mockResolvedValue(null);
    const newToken = new DeviceToken();
    newToken.id = 'new-token-id';
    mockDeviceTokenRepository.save.mockResolvedValue(newToken);

    const result = await service.registerDeviceToken(
      'user1',
      'device-token',
      'iPhone',
    );

    expect(mockDeviceTokenRepository.findOne).toHaveBeenCalled();
    expect(mockDeviceTokenRepository.save).toHaveBeenCalled();
    expect(result.id).toBe('new-token-id');
  });

  // Add more tests for other methods
});
```

### Integration Tests

Create integration tests that verify the full notification flow:

```typescript
// test/notification.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { TasksService } from '../src/tasks/tasks.service';
import { NotificationService } from '../src/notification/services/notification.service';

describe('Notification System (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let tasksService: TasksService;
  let notificationService: NotificationService;
  let accessToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    tasksService = moduleFixture.get<TasksService>(TasksService);
    notificationService =
      moduleFixture.get<NotificationService>(NotificationService);

    // Create a test user and get an access token
    testUserId = 'test-user-id';
    accessToken = await authService.generateJwt({ id: testUserId });

    // Spy on notification service
    jest
      .spyOn(notificationService, 'sendTaskNotification')
      .mockResolvedValue(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a device token', async () => {
    await request(app.getHttpServer())
      .post('/device-registration')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        token: 'test-device-token',
        deviceName: 'Test iPhone',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('registered successfully');
      });
  });

  it('should send a notification when a task is due', async () => {
    // Create a task with reminder
    const task = await tasksService.create(
      {
        title: 'Test Task with Reminder',
        description: 'This is a test',
        needsReminder: true,
        dueDate: new Date(Date.now() + 1000), // Due in 1 second
      },
      testUserId,
    );

    // Wait for the task to become due
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Manually trigger the reminder check
    const reminderScheduler = app.get('TaskReminderScheduler');
    await reminderScheduler.checkAndSendReminders();

    // Verify the notification was sent
    expect(notificationService.sendTaskNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: task.id }),
    );
  });
});
```

## Deployment Considerations

### Apple Push Notification Service Certificates

1. Store certificates securely and don't commit them to source control
2. Use environment variables to configure the path to certificates
3. Consider using different certificates for development and production

### Production Configuration

1. Use a production flag to enable production mode for APNS
2. Consider implementing queue processing for high-volume notifications
3. Add monitoring and alerting for notification failures

### Scaling

1. Consider using a distributed queue (e.g., Redis or RabbitMQ) for handling notifications at scale
2. Implement batch processing for sending notifications to large user groups
3. Add rate limiting to prevent notification flooding

## Troubleshooting

### Common Issues

1. **Invalid Device Tokens**: Apple device tokens can become invalid when a user uninstalls the app or resets their device. Implement proper error handling and token cleanup.

2. **Certificate Issues**: Ensure that your APNS certificates are valid and not expired. Use the correct certificate type for your environment (development or production).

3. **Payload Size Limits**: APNS has a 4KB limit for notification payloads. Keep your payloads small and efficient.

4. **Connection Issues**: Implement proper error handling and retry logic for APNS connection issues.

### Debugging Steps

1. Enable verbose logging for the notification service
2. Verify device token registration in your database
3. Test notifications using the APNS development environment
4. Use Apple's Feedback Service to track and remove invalid device tokens

### Monitoring

1. Track notification delivery success rates
2. Monitor certificate expiration dates
3. Set up alerts for high notification failure rates

## Conclusion

This implementation follows Domain-Driven Design principles by:

- Keeping business logic in the domain layer (NotificationDomainService)
- Using application services to coordinate processes (NotificationService)
- Implementing infrastructure concerns separately (PushNotificationService)
- Providing clean interfaces for registration (DeviceRegistrationController)

The architecture is extensible and can be easily adapted to support additional notification channels in the future.
