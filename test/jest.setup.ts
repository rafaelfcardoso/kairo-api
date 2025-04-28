import 'jest-extended';

// Increase timeout for all tests since E2E tests might take longer
jest.setTimeout(30000);

// Clean up any mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
});
