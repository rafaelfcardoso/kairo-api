# Dependencies for DDD Implementation

## Required npm packages

To fully implement the Domain-Driven Design approach in the Zenith API, you'll need to install these packages:

```bash
npm install @nestjs/schedule @nestjs/axios rrule moment-timezone axios
```

### Package Purposes:

1. **@nestjs/schedule**: For cron jobs and scheduled tasks

   - Used by the SchedulerService to check for due tasks
   - Runs recurring task management

2. **@nestjs/axios**: For HTTP requests to external services

   - Used by the AiService to communicate with the Python AI service
   - Replaces the built-in HttpModule from @nestjs/common which is deprecated

3. **rrule**: For handling recurrence rules (RFC 5545 / iCalendar)

   - Used by the RecurrenceRule value object
   - Provides parsing and calculations for recurring task schedules

4. **moment-timezone**: For timezone-aware date formatting and manipulation

   - Used by the TaskDomainService
   - Ensures consistent date handling across different user timezones

5. **axios**: Peer dependency for @nestjs/axios
   - Underlying HTTP client used by @nestjs/axios

## Database Migration

After installing these packages, you'll need to run a database migration to accommodate the changes to the Task entity:

```bash
npm run migration:generate -- -n AddRecurrenceAndTaskType
npm run migration:run
```

## Development Dependencies

For better type support, you might want to install the following development dependencies:

```bash
npm install --save-dev @types/rrule @types/moment-timezone
```
