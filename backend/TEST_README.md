# ELDERCARE+ Backend Testing Guide

Comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
backend/
├── src/
│   └── modules/
│       ├── falls/
│       │   ├── falls.service.ts
│       │   └── falls.service.spec.ts      # Unit tests
│       ├── devices/
│       │   └── devices.service.spec.ts
│       └── medication/
│           └── medication.service.spec.ts
└── test/
    ├── jest-e2e.json                       # E2E Jest config
    ├── setup.ts                            # Test setup
    ├── auth.e2e-spec.ts                    # Authentication E2E
    ├── falls.e2e-spec.ts                   # Fall detection E2E
    └── devices.e2e-spec.ts                 # Devices E2E
```

## Test Types

### 1. Unit Tests

Unit tests focus on individual components in isolation.

**Location**: `src/modules/**/*.spec.ts`

**Run**:
```bash
npm run test                # Run all unit tests
npm run test:watch          # Watch mode
npm run test:cov            # With coverage
```

**Example**:
```typescript
describe('FallsService', () => {
  it('should create a fall event', async () => {
    const result = await service.create(createFallDto, mockUser);
    expect(result).toHaveProperty('id');
  });
});
```

### 2. Integration Tests

Integration tests verify that multiple components work together correctly.

**Location**: `test/*.e2e-spec.ts`

**Run**:
```bash
npm run test:e2e            # Run all E2E tests
```

### 3. End-to-End (E2E) Tests

E2E tests simulate real user workflows through the entire API.

**Location**: `test/*.e2e-spec.ts`

**Example**:
```typescript
describe('Fall Detection (e2e)', () => {
  it('should create and acknowledge fall event', async () => {
    // Create fall
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/falls')
      .set('Authorization', `Bearer ${token}`)
      .send(fallData)
      .expect(201);

    // Acknowledge fall
    await request(app.getHttpServer())
      .put(`/api/v1/falls/${createRes.body.id}/acknowledge`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

## Running Tests

### Prerequisites

1. **Test Database**: Create a separate test database

```bash
# Using Docker
docker-compose up -d postgres

# Create test database
docker-compose exec postgres psql -U eldercare -c "CREATE DATABASE eldercare_test;"
```

2. **Environment Variables**: Copy test environment

```bash
cp .env.test .env.test.local
# Update with your test database credentials
```

### Run All Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:cov
npm run test:e2e
```

### Run Specific Test Files

```bash
# Specific unit test
npm run test -- falls.service.spec.ts

# Specific E2E test
npm run test:e2e -- auth.e2e-spec.ts

# Watch mode for specific file
npm run test:watch -- falls.service.spec.ts
```

### Run Tests with Coverage

```bash
# Unit test coverage
npm run test:cov

# View coverage report
open coverage/lcov-report/index.html
```

## Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Services | 90%+ |
| Controllers | 85%+ |
| Entities | 80%+ |
| Utilities | 95%+ |
| **Overall** | **85%+** |

## Writing Tests

### Unit Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        // Mock dependencies
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle errors', async () => {
      // Test error cases
      await expect(service.methodName(null)).rejects.toThrow();
    });
  });
});
```

### E2E Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('YourModule (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply middleware, pipes, etc.
    await app.init();

    // Setup (authenticate, create test data)
  });

  afterAll(async () => {
    // Cleanup
    await app.close();
  });

  describe('GET /api/v1/endpoint', () => {
    it('should return data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/endpoint')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });
  });
});
```

## Mocking

### Mock Repository

```typescript
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
```

### Mock External Services

```typescript
// Already configured in test/setup.ts
// - AWS SDK (IoT, S3, SQS)
// - Twilio
// - Firebase Admin
```

### Mock User

```typescript
const mockUser: User = {
  id: 'user-123',
  email: 'test@eldercare.com',
  role: 'ELDER',
} as User;
```

## Test Data Factories

Create reusable test data:

```typescript
// test/factories/user.factory.ts
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  email: 'test@eldercare.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'ELDER',
  ...overrides,
});
```

## CI/CD Integration

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/backend-deploy.yml
- name: Run unit tests
  run: npm run test

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "--watchAll=false",
    "${fileBasename}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Specific Test

```bash
# Add debugger statement in test
it('should do something', async () => {
  debugger;
  const result = await service.method();
});

# Run with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand test/auth.e2e-spec.ts
```

## Performance Testing

### Load Testing with Artillery

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run test/load/api-load-test.yml
```

### Database Query Performance

```typescript
// Enable query logging
DB_LOGGING=true npm run test:e2e

// Use query builder explain
const query = repository
  .createQueryBuilder('fall')
  .where('fall.severity = :severity', { severity: 'HIGH' });

const explain = await query.getQueryAndParameters();
console.log(explain);
```

## Best Practices

1. **Arrange-Act-Assert Pattern**: Structure tests clearly
2. **Descriptive Names**: Use clear, descriptive test names
3. **One Assertion Per Test**: Focus on single behavior
4. **Test Edge Cases**: Include error scenarios
5. **Mock External Dependencies**: Don't call real APIs
6. **Clean Up**: Reset state between tests
7. **Fast Tests**: Keep unit tests under 100ms
8. **Isolated Tests**: Tests should not depend on each other

## Common Issues

### Tests Fail Due to Database Connection

```bash
# Check database is running
docker-compose ps postgres

# Verify connection
psql -h localhost -U eldercare_test -d eldercare_test

# Reset test database
npm run migration:revert
npm run migration:run
```

### Port Already in Use

```bash
# Change test port in .env.test
PORT=3001

# Or kill process using port
lsof -ti:3000 | xargs kill -9
```

### Timeout Errors

```bash
# Increase timeout in jest.config.js
{
  "testTimeout": 30000
}

# Or per test
it('slow test', async () => {
  // test
}, 60000);
```

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
