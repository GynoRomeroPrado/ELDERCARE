/**
 * Servicio de Alertas
 * Gestión de configuración de alertas y triggers
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertConfig } from './entities/alert-config.entity';
import { AlertHistory } from './entities/alert-history.entity';
import {
  CreateAlertConfigDto,
  UpdateAlertConfigDto,
  AlertQueryDto,
  TriggerAlertDto,
  ResolveAlertDto,
  AlertStatus,
} from './dto/alerts.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertConfig)
    private alertConfigRepository: Repository<AlertConfig>,
    @InjectRepository(AlertHistory)
    private alertHistoryRepository: Repository<AlertHistory>,
  ) {}

  /**
   * Crear configuración de alerta
   */
  async createConfig(createDto: CreateAlertConfigDto): Promise<AlertConfig> {
    const config = this.alertConfigRepository.create(createDto);
    return this.alertConfigRepository.save(config);
  }

  /**
   * Obtener todas las configuraciones de alertas
   */
  async findAllConfigs(query: AlertQueryDto): Promise<{
    data: AlertConfig[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, alertType, priority, status, userId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.alertConfigRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.user', 'user')
      .skip(skip)
      .take(limit);

    if (alertType) {
      queryBuilder.andWhere('config.alertType = :alertType', { alertType });
    }

    if (priority) {
      queryBuilder.andWhere('config.priority = :priority', { priority });
    }

    if (userId) {
      queryBuilder.andWhere('config.userId = :userId', { userId });
    }

    if (status === AlertStatus.ACTIVE) {
      queryBuilder.andWhere('config.enabled = :enabled', { enabled: true });
    } else if (status === AlertStatus.INACTIVE) {
      queryBuilder.andWhere('config.enabled = :enabled', { enabled: false });
    }

    queryBuilder.orderBy('config.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener configuración por ID
   */
  async findOneConfig(id: string): Promise<AlertConfig> {
    const config = await this.alertConfigRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!config) {
      throw new NotFoundException('Configuración de alerta no encontrada');
    }

    return config;
  }

  /**
   * Actualizar configuración de alerta
   */
  async updateConfig(
    id: string,
    updateDto: UpdateAlertConfigDto,
  ): Promise<AlertConfig> {
    const config = await this.findOneConfig(id);
    Object.assign(config, updateDto);
    return this.alertConfigRepository.save(config);
  }

  /**
   * Eliminar configuración de alerta
   */
  async removeConfig(id: string): Promise<void> {
    const config = await this.findOneConfig(id);
    await this.alertConfigRepository.delete(id);
  }

  /**
   * Habilitar/deshabilitar alerta
   */
  async toggleConfig(id: string, enabled: boolean): Promise<AlertConfig> {
    const config = await this.findOneConfig(id);
    config.enabled = enabled;
    return this.alertConfigRepository.save(config);
  }

  /**
   * Disparar una alerta
   */
  async triggerAlert(triggerDto: TriggerAlertDto): Promise<AlertHistory> {
    const config = await this.findOneConfig(triggerDto.alertConfigId);

    if (!config.enabled) {
      throw new BadRequestException('La configuración de alerta está deshabilitada');
    }

    // Crear registro en historial
    const alert = this.alertHistoryRepository.create({
      alertConfigId: config.id,
      message: triggerDto.message,
      data: triggerDto.data,
      triggeredAt: new Date(),
      status: AlertStatus.TRIGGERED,
    });

    const savedAlert = await this.alertHistoryRepository.save(alert);

    // Actualizar contador y última vez disparada
    config.triggerCount += 1;
    config.lastTriggeredAt = new Date();
    await this.alertConfigRepository.save(config);

    // Aquí enviaríamos las notificaciones a través de los canales configurados
    // usando el servicio de notificaciones
    // await this.notificationsService.send(config.channels, triggerDto.message, triggerDto.data);

    return savedAlert;
  }

  /**
   * Resolver una alerta
   */
  async resolveAlert(id: string, resolveDto: ResolveAlertDto): Promise<AlertHistory> {
    const alert = await this.alertHistoryRepository.findOne({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new BadRequestException('La alerta ya está resuelta');
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedReason = resolveDto.resolvedReason;
    alert.resolvedBy = resolveDto.resolvedBy;

    return this.alertHistoryRepository.save(alert);
  }

  /**
   * Obtener historial de alertas
   */
  async getHistory(query: AlertQueryDto): Promise<{
    data: AlertHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, alertType, priority, status, userId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.alertHistoryRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.alertConfig', 'config')
      .leftJoinAndSelect('history.resolver', 'resolver')
      .skip(skip)
      .take(limit);

    if (alertType) {
      queryBuilder.andWhere('config.alertType = :alertType', { alertType });
    }

    if (priority) {
      queryBuilder.andWhere('config.priority = :priority', { priority });
    }

    if (status) {
      queryBuilder.andWhere('history.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('config.userId = :userId', { userId });
    }

    queryBuilder.orderBy('history.triggeredAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener estadísticas de alertas
   */
  async getStatistics(userId?: string): Promise<any> {
    const queryBuilder = this.alertHistoryRepository
      .createQueryBuilder('history')
      .leftJoin('history.alertConfig', 'config');

    if (userId) {
      queryBuilder.where('config.userId = :userId', { userId });
    }

    const total = await queryBuilder.getCount();

    const byType = await queryBuilder
      .select('config.alertType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('config.alertType')
      .getRawMany();

    const byPriority = await queryBuilder
      .select('config.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('config.priority')
      .getRawMany();

    const byStatus = await queryBuilder
      .select('history.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('history.status')
      .getRawMany();

    const activeConfigs = await this.alertConfigRepository.count({
      where: { enabled: true },
    });

    const last24h = await queryBuilder
      .where("history.triggeredAt > NOW() - INTERVAL '24 hours'")
      .getCount();

    const avgResolutionTime = await this.alertHistoryRepository
      .createQueryBuilder('history')
      .select(
        'AVG(EXTRACT(EPOCH FROM (history.resolvedAt - history.triggeredAt)))',
        'avgTime',
      )
      .where('history.resolvedAt IS NOT NULL')
      .getRawOne();

    return {
      total,
      activeConfigs,
      last24h,
      avgResolutionTimeSeconds: avgResolutionTime.avgTime
        ? parseFloat(avgResolutionTime.avgTime).toFixed(2)
        : null,
      byType: byType.reduce((acc, curr) => {
        acc[curr.type] = parseInt(curr.count);
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, curr) => {
        acc[curr.priority] = parseInt(curr.count);
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr.status] = parseInt(curr.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Evaluar condiciones y disparar alertas automáticamente
   * Este método sería llamado por un CRON job o event listener
   */
  async evaluateConditions(): Promise<void> {
    const configs = await this.alertConfigRepository.find({
      where: { enabled: true },
    });

    for (const config of configs) {
      // Aquí implementaríamos la lógica de evaluación de condiciones
      // según el tipo de alerta y las condiciones configuradas

      // Ejemplo para LOW_BATTERY:
      // if (config.alertType === AlertType.LOW_BATTERY) {
      //   const threshold = config.conditions?.batteryThreshold || 20;
      //   const devices = await this.deviceRepository.find({
      //     where: { batteryLevel: LessThan(threshold) }
      //   });
      //   for (const device of devices) {
      //     await this.triggerAlert({
      //       alertConfigId: config.id,
      //       message: `Batería baja en ${device.name}: ${device.batteryLevel}%`,
      //       data: { deviceId: device.id, batteryLevel: device.batteryLevel }
      //     });
      //   }
      // }
    }
  }
}
