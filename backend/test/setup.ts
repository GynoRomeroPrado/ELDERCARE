/**
 * Test Setup
 * Global configuration for E2E tests
 */

import { configDotenv } from 'dotenv';

// Load test environment variables
configDotenv({ path: '.env.test' });

// Set test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Setup global test data or connections if needed
  console.log('🧪 Starting E2E test suite...');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('✅ E2E test suite completed');
});

// Mock external services for tests
jest.mock('aws-sdk', () => ({
  IoTData: jest.fn().mockImplementation(() => ({
    publish: jest.fn().mockResolvedValue({}),
  })),
  S3: jest.fn().mockImplementation(() => ({
    putObject: jest.fn().mockResolvedValue({}),
    getObject: jest.fn().mockResolvedValue({}),
  })),
  SQS: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'TEST_MESSAGE_SID' }),
    },
    video: {
      rooms: {
        create: jest.fn().mockResolvedValue({ sid: 'TEST_ROOM_SID', uniqueName: 'test-room' }),
      },
    },
  })),
}));

jest.mock('firebase-admin', () => ({
  messaging: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue('TEST_MESSAGE_ID'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  })),
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
}));
