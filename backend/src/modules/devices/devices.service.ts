/**
 * Servicio de Dispositivos
 * Lógica de negocio para gestión de dispositivos IoT
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceTelemetryDto,
  DeviceQueryDto,
  FirmwareUpdateDto,
  DeviceStatus,
  HealthStatus,
} from './dto/devices.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  /**
   * Registrar nuevo dispositivo
   */
  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    // Verificar si el número de serie ya existe
    const existingDevice = await this.deviceRepository.findOne({
      where: { serialNumber: createDeviceDto.serialNumber },
    });

    if (existingDevice) {
      throw new ConflictException('El número de serie ya está registrado');
    }

    // Crear dispositivo
    const device = this.deviceRepository.create({
      ...createDeviceDto,
      provisionedAt: new Date(),
    });

    return this.deviceRepository.save(device);
  }

  /**
   * Obtener todos los dispositivos con filtros
   */
  async findAll(query: DeviceQueryDto): Promise<{
    data: Device[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, deviceType, status, healthStatus, ownerId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.owner', 'owner')
      .select([
        'device',
        'owner.id',
        'owner.email',
        'owner.firstName',
        'owner.lastName',
      ])
      .skip(skip)
      .take(limit);

    // Filtros
    if (deviceType) {
      queryBuilder.andWhere('device.deviceType = :deviceType', { deviceType });
    }

    if (status) {
      queryBuilder.andWhere('device.status = :status', { status });
    }

    if (healthStatus) {
      queryBuilder.andWhere('device.healthStatus = :healthStatus', { healthStatus });
    }

    if (ownerId) {
      queryBuilder.andWhere('device.ownerId = :ownerId', { ownerId });
    }

    queryBuilder.orderBy('device.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener dispositivo por ID
   */
  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    return device;
  }

  /**
   * Obtener dispositivos de un usuario
   */
  async findByOwner(ownerId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Actualizar dispositivo
   */
  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);

    // Si se activa el dispositivo, actualizar activatedAt
    if (updateDeviceDto.status === DeviceStatus.ACTIVE && device.status !== DeviceStatus.ACTIVE) {
      device.activatedAt = new Date();
    }

    // Si se descomisiona, actualizar decommissionedAt
    if (updateDeviceDto.status === DeviceStatus.DECOMMISSIONED) {
      device.decommissionedAt = new Date();
    }

    Object.assign(device, updateDeviceDto);

    return this.deviceRepository.save(device);
  }

  /**
   * Actualizar heartbeat del dispositivo
   */
  async updateHeartbeat(id: string): Promise<void> {
    await this.deviceRepository.update(id, {
      lastHeartbeat: new Date(),
      healthStatus: HealthStatus.HEALTHY,
    });
  }

  /**
   * Registrar telemetría del dispositivo
   */
  async recordTelemetry(id: string, telemetryDto: DeviceTelemetryDto): Promise<void> {
    const device = await this.findOne(id);

    // Actualizar métricas del dispositivo
    const updates: any = {
      lastHeartbeat: new Date(),
    };

    if (telemetryDto.batteryLevel !== undefined) {
      updates.batteryLevel = telemetryDto.batteryLevel;

      // Actualizar estado de salud basado en batería
      if (telemetryDto.batteryLevel < 20) {
        updates.healthStatus = HealthStatus.CRITICAL;
      } else if (telemetryDto.batteryLevel < 40) {
        updates.healthStatus = HealthStatus.WARNING;
      } else {
        updates.healthStatus = HealthStatus.HEALTHY;
      }
    }

    if (telemetryDto.signalStrength !== undefined) {
      updates.wifiSignalStrength = telemetryDto.signalStrength;
    }

    // Actualizar health metrics
    const healthMetrics = device.healthMetrics || {};
    if (telemetryDto.temperature !== undefined) {
      healthMetrics.temperature = telemetryDto.temperature;
    }
    if (telemetryDto.humidity !== undefined) {
      healthMetrics.humidity = telemetryDto.humidity;
    }
    if (telemetryDto.metadata) {
      Object.assign(healthMetrics, telemetryDto.metadata);
    }
    updates.healthMetrics = healthMetrics;

    await this.deviceRepository.update(id, updates);

    // Aquí también guardaríamos los datos en la tabla device_telemetry
    // para el histórico de series temporales
  }

  /**
   * Obtener estado de salud del dispositivo
   */
  async getHealth(id: string): Promise<any> {
    const device = await this.findOne(id);

    const now = new Date();
    const lastHeartbeat = device.lastHeartbeat ? new Date(device.lastHeartbeat) : null;
    const minutesSinceHeartbeat = lastHeartbeat
      ? Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000 / 60)
      : null;

    return {
      deviceId: device.id,
      deviceType: device.deviceType,
      status: device.status,
      healthStatus: device.healthStatus,
      lastHeartbeat: device.lastHeartbeat,
      minutesSinceHeartbeat,
      batteryLevel: device.batteryLevel,
      signalStrength: device.wifiSignalStrength,
      metrics: device.healthMetrics,
      isOnline: minutesSinceHeartbeat !== null && minutesSinceHeartbeat < 5,
    };
  }

  /**
   * Iniciar actualización de firmware
   */
  async startFirmwareUpdate(id: string, firmwareDto: FirmwareUpdateDto): Promise<void> {
    const device = await this.findOne(id);

    // En producción, esto enviaría un mensaje MQTT al dispositivo
    // para iniciar la descarga y actualización OTA

    // Por ahora, solo actualizamos el registro
    await this.deviceRepository.update(id, {
      metadata: {
        ...device.metadata,
        pendingFirmwareUpdate: {
          version: firmwareDto.version,
          downloadUrl: firmwareDto.downloadUrl,
          initiatedAt: new Date(),
          status: 'pending',
        },
      },
    });
  }

  /**
   * Confirmar actualización de firmware
   */
  async confirmFirmwareUpdate(id: string, version: string): Promise<void> {
    await this.deviceRepository.update(id, {
      firmwareVersion: version,
    });
  }

  /**
   * Eliminar dispositivo
   */
  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);
    await this.deviceRepository.delete(id);
  }

  /**
   * Obtener estadísticas de dispositivos
   */
  async getStatistics(ownerId?: string): Promise<any> {
    const queryBuilder = this.deviceRepository.createQueryBuilder('device');

    if (ownerId) {
      queryBuilder.where('device.ownerId = :ownerId', { ownerId });
    }

    const total = await queryBuilder.getCount();

    const byType = await queryBuilder
      .select('device.deviceType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('device.deviceType')
      .getRawMany();

    const byStatus = await queryBuilder
      .select('device.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('device.status')
      .getRawMany();

    const byHealth = await queryBuilder
      .select('device.healthStatus', 'health')
      .addSelect('COUNT(*)', 'count')
      .groupBy('device.healthStatus')
      .getRawMany();

    const online = await queryBuilder
      .where("device.lastHeartbeat > NOW() - INTERVAL '5 minutes'")
      .getCount();

    return {
      total,
      online,
      offline: total - online,
      byType: byType.reduce((acc, curr) => {
        acc[curr.type] = parseInt(curr.count);
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr.status] = parseInt(curr.count);
        return acc;
      }, {}),
      byHealth: byHealth.reduce((acc, curr) => {
        acc[curr.health] = parseInt(curr.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Verificar dispositivos offline
   */
  async findOfflineDevices(minutesThreshold: number = 15): Promise<Device[]> {
    return this.deviceRepository
      .createQueryBuilder('device')
      .where('device.status = :status', { status: DeviceStatus.ACTIVE })
      .andWhere(`device.lastHeartbeat < NOW() - INTERVAL ':minutes minutes'`, {
        minutes: minutesThreshold,
      })
      .getMany();
  }
}
