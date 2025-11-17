/**
 * Tests Unitarios para CacheService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Mock de Redis
jest.mock('ioredis');

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisClient: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'test-password',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Crear mock del cliente Redis
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      flushall: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
      () => mockRedisClient as any
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should retrieve value from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await service.get('invalid-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store value in cache without TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value)
      );
    });

    it('should store value in cache with TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const ttl = 3600;
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      );
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      const key = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'test-key';
      const cachedValue = { data: 'cached' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      const factory = jest.fn().mockResolvedValue({ data: 'fresh' });

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const key = 'test-key';
      const freshValue = { data: 'fresh' };
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      const factory = jest.fn().mockResolvedValue(freshValue);

      const result = await service.getOrSet(key, factory);

      expect(factory).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(freshValue)
      );
      expect(result).toEqual(freshValue);
    });

    it('should cache result with TTL if provided', async () => {
      const key = 'test-key';
      const freshValue = { data: 'fresh' };
      const ttl = 1800;
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue('OK');

      const factory = jest.fn().mockResolvedValue(freshValue);

      await service.getOrSet(key, factory, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(freshValue)
      );
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request within rate limit', async () => {
      const key = 'user:123';
      const limit = 100;
      const window = 60;

      mockRedisClient.incr.mockResolvedValue(5);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.checkRateLimit(key, limit, window);

      expect(result).toBe(true);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(`ratelimit:${key}`);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `ratelimit:${key}`,
        window
      );
    });

    it('should block request exceeding rate limit', async () => {
      const key = 'user:123';
      const limit = 100;
      const window = 60;

      mockRedisClient.incr.mockResolvedValue(101);

      const result = await service.checkRateLimit(key, limit, window);

      expect(result).toBe(false);
    });

    it('should set expiration only on first request', async () => {
      const key = 'user:123';
      const limit = 100;
      const window = 60;

      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await service.checkRateLimit(key, limit, window);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `ratelimit:${key}`,
        window
      );
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      mockRedisClient.flushall.mockResolvedValue('OK');

      await service.clear();

      expect(mockRedisClient.flushall).toHaveBeenCalled();
    });
  });

  describe('setSession', () => {
    it('should store session data', async () => {
      const sessionId = 'session-123';
      const sessionData = { userId: 'user-456', role: 'ELDER' };
      const ttl = 86400;

      mockRedisClient.setex.mockResolvedValue('OK');

      await service.setSession(sessionId, sessionData, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `session:${sessionId}`,
        ttl,
        JSON.stringify(sessionData)
      );
    });
  });

  describe('getSession', () => {
    it('should retrieve session data', async () => {
      const sessionId = 'session-123';
      const sessionData = { userId: 'user-456', role: 'ELDER' };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await service.getSession(sessionId);

      expect(mockRedisClient.get).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(result).toEqual(sessionData);
    });

    it('should return null for invalid session', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getSession('invalid-session');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session data', async () => {
      const sessionId = 'session-123';
      mockRedisClient.del.mockResolvedValue(1);

      await service.deleteSession(sessionId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
