/**
 * Falls Service Unit Tests
 * Tests business logic for fall detection and event management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FallsService } from './falls.service';
import { FallEvent } from './entities/fall-event.entity';
import { Device } from '../devices/entities/device.entity';
import { User } from '../users/entities/user.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FallsService', () => {
  let service: FallsService;
  let fallRepository: Repository<FallEvent>;
  let deviceRepository: Repository<Device>;

  const mockFallRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getOne: jest.fn(),
    })),
  };

  const mockDeviceRepository = {
    findOne: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@eldercare.com',
    role: 'ELDER',
  } as User;

  const mockDevice: Device = {
    id: 'device-123',
    deviceType: 'FALL_SENSOR',
    serialNumber: 'FALL-001',
    status: 'ACTIVE',
    owner: mockUser,
  } as Device;

  const mockFallEvent: FallEvent = {
    id: 'fall-123',
    device: mockDevice,
    detectedAt: new Date(),
    severity: 'HIGH',
    confidence: 0.95,
    status: 'PENDING',
    falseAlarm: false,
    sensorData: {
      radarPointCloud: { points: 150 },
    },
  } as FallEvent;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FallsService,
        {
          provide: getRepositoryToken(FallEvent),
          useValue: mockFallRepository,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
      ],
    }).compile();

    service = module.get<FallsService>(FallsService);
    fallRepository = module.get<Repository<FallEvent>>(getRepositoryToken(FallEvent));
    deviceRepository = module.get<Repository<Device>>(getRepositoryToken(Device));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createFallDto = {
      deviceId: 'device-123',
      detectedAt: new Date(),
      severity: 'HIGH' as const,
      confidence: 0.95,
      sensorData: {
        radarPointCloud: { points: 150 },
      },
    };

    it('should create a fall event successfully', async () => {
      mockDeviceRepository.findOne.mockResolvedValue(mockDevice);
      mockFallRepository.create.mockReturnValue(mockFallEvent);
      mockFallRepository.save.mockResolvedValue(mockFallEvent);

      const result = await service.create(createFallDto, mockUser);

      expect(deviceRepository.findOne).toHaveBeenCalledWith({
        where: { id: createFallDto.deviceId },
      });
      expect(fallRepository.create).toHaveBeenCalled();
      expect(fallRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockFallEvent);
    });

    it('should throw NotFoundException if device not found', async () => {
      mockDeviceRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createFallDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set status based on severity', async () => {
      mockDeviceRepository.findOne.mockResolvedValue(mockDevice);

      const highSeverityDto = { ...createFallDto, severity: 'HIGH' as const };
      await service.create(highSeverityDto, mockUser);

      expect(mockFallRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated fall events', async () => {
      const mockFalls = [mockFallEvent];
      mockFallRepository.createQueryBuilder().getManyAndCount.mockResolvedValue([
        mockFalls,
        1,
      ]);

      const result = await service.findAll(mockUser, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: mockFalls,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should filter by severity', async () => {
      const mockFalls = [mockFallEvent];
      mockFallRepository.createQueryBuilder().getManyAndCount.mockResolvedValue([
        mockFalls,
        1,
      ]);

      await service.findAll(mockUser, {
        page: 1,
        limit: 10,
        severity: 'HIGH',
      });

      expect(mockFallRepository.createQueryBuilder().andWhere).toHaveBeenCalledWith(
        'fallEvent.severity = :severity',
        { severity: 'HIGH' },
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.findAll(mockUser, {
        page: 1,
        limit: 10,
        startDate,
        endDate,
      });

      expect(mockFallRepository.createQueryBuilder().andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a fall event by ID', async () => {
      mockFallRepository.findOne.mockResolvedValue(mockFallEvent);

      const result = await service.findOne('fall-123', mockUser);

      expect(fallRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'fall-123' },
        relations: ['device', 'device.owner'],
      });
      expect(result).toEqual(mockFallEvent);
    });

    it('should throw NotFoundException if fall event not found', async () => {
      mockFallRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('fall-999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge a fall event', async () => {
      const pendingFall = { ...mockFallEvent, status: 'PENDING' };
      mockFallRepository.findOne.mockResolvedValue(pendingFall);
      mockFallRepository.save.mockResolvedValue({
        ...pendingFall,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      });

      const result = await service.acknowledge('fall-123', mockUser, {
        notes: 'Patient is fine',
      });

      expect(result.status).toBe('ACKNOWLEDGED');
      expect(result.acknowledgedAt).toBeDefined();
    });

    it('should throw BadRequestException if already acknowledged', async () => {
      const acknowledgedFall = { ...mockFallEvent, status: 'ACKNOWLEDGED' };
      mockFallRepository.findOne.mockResolvedValue(acknowledgedFall);

      await expect(
        service.acknowledge('fall-123', mockUser, { notes: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markFalseAlarm', () => {
    it('should mark fall event as false alarm', async () => {
      mockFallRepository.findOne.mockResolvedValue(mockFallEvent);
      mockFallRepository.save.mockResolvedValue({
        ...mockFallEvent,
        falseAlarm: true,
        status: 'FALSE_ALARM',
      });

      const result = await service.markFalseAlarm('fall-123', mockUser, {
        reason: 'Pet triggered sensor',
      });

      expect(result.falseAlarm).toBe(true);
      expect(result.status).toBe('FALSE_ALARM');
    });
  });

  describe('callEmergency', () => {
    it('should call emergency services', async () => {
      mockFallRepository.findOne.mockResolvedValue(mockFallEvent);
      mockFallRepository.save.mockResolvedValue({
        ...mockFallEvent,
        emergencyServicesCalled: true,
        status: 'EMERGENCY',
        emergencyCalledAt: new Date(),
      });

      const result = await service.callEmergency('fall-123', mockUser, {
        contactEmergencyServices: true,
        notes: 'Patient unresponsive',
      });

      expect(result.emergencyServicesCalled).toBe(true);
      expect(result.status).toBe('EMERGENCY');
    });
  });

  describe('getStatistics', () => {
    it('should calculate fall statistics', async () => {
      const mockStats = {
        totalFalls: 10,
        falseAlarms: 2,
        averageConfidence: 0.89,
      };

      mockFallRepository.createQueryBuilder().getOne.mockResolvedValue(mockStats);

      const result = await service.getStatistics(mockUser, 30);

      expect(result).toHaveProperty('totalFalls');
      expect(result).toHaveProperty('falseAlarmRate');
    });
  });
});
