# AI Service Mocking Implementation

This document explains how the AI service is mocked for testing purposes in the Zenith API application.

## Overview

The Zenith API uses an external AI service for natural language processing of tasks. In testing environments, we want to avoid making actual HTTP calls to this service to ensure:

1. Deterministic test results
2. Faster test execution
3. No dependency on external services
4. Controlled responses for testing different scenarios

## Implementation Details

### MockAiService

The `MockAiService` class in `test/mocks/mock-ai.service.ts` provides a deterministic implementation that can be used in tests. Key features:

- Implements the same interface as the real `AiService`
- Returns predictable responses based on input patterns
- Allows customizing responses for specific test cases
- Simulates token usage and other AI service metadata

### Mock Providers

The `MockAiServiceProvider` in `test/mocks/mock-providers.ts` is a NestJS provider that can be used to inject the mock implementation in place of the real service:

```typescript
export const MockAiServiceProvider: Provider = {
  provide: AiService,
  useClass: MockAiService,
};
```

### Test App Configuration

The `getTestApp` function in `test/test-utils.ts` has been updated to accept a `useMocks` parameter, which when set to `true`, will configure the test application to use the mock services:

```typescript
export async function getTestApp(useMocks = false): Promise<INestApplication> {
  // ...
  if (useMocks) {
    // Override AiService with MockAiService
    moduleBuilder.overrideProvider(AiService).useClass(MockAiService);
  }
  // ...
}
```

## Using the Mock in Tests

To use the mocked AI service in your tests:

1. Call `getTestApp(true)` when initializing your test app
2. The mock AI service will be used for all calls to the AI service
3. Responses will be based on patterns in the input text

Example:

```typescript
describe('My Test Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Initialize app with mocked AI service
    app = await getTestApp(true);
    // ... rest of test setup
  });

  // Your tests will now use the MockAiService
});
```

## Customizing Mock Responses

The `MockAiService` can be configured to provide specific responses for different input patterns:

```typescript
// Get the MockAiService instance from the testing module
const mockAiService = app.get<MockAiService>(AiService);

// Set a custom response for a specific keyword
mockAiService.setMockResponse('my-custom-keyword', {
  // Custom response object
});
```

## Default Mock Patterns

The mock service has built-in responses for common patterns:

- Tasks with "tomorrow" in the description will have a due date set to tomorrow
- Tasks with "high priority" will have high priority settings
- Tasks with "tag" will include a sample tag
- Tasks with "project" will have a project association

## Troubleshooting

If tests are not working with the mock service:

1. Verify that `getTestApp(true)` is being called
2. Check that the AI service is being injected correctly
3. Make sure the test environment has the `.env.test` file configured
4. Verify that the mock responses match what your test is expecting
