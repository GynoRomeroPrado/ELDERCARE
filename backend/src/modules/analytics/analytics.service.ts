/**
 * Servicio de Analytics
 * Generación de reportes, estadísticas y análisis de datos
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Medication } from '../medications/entities/medication.entity';
import { MedicationSchedule } from '../medications/entities/medication-schedule.entity';
import { MedicationLog } from '../medications/entities/medication-log.entity';
import { Fall } from '../falls/entities/fall.entity';
import { Device } from '../devices/entities/device.entity';
import { ReportQueryDto, ExportReportDto, TimeSeriesQueryDto, ReportPeriod } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Medication)
    private medicationRepository: Repository<Medication>,
    @InjectRepository(MedicationSchedule)
    private scheduleRepository: Repository<MedicationSchedule>,
    @InjectRepository(MedicationLog)
    private logRepository: Repository<MedicationLog>,
    @InjectRepository(Fall)
    private fallRepository: Repository<Fall>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  /**
   * Obtener reporte de adherencia a medicamentos
   */
  async getMedicationAdherenceReport(query: ReportQueryDto): Promise<any> {
    const { startDate, endDate, userId } = this.getDateRange(query);

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .leftJoin('log.schedule', 'schedule')
      .leftJoin('schedule.medication', 'medication')
      .leftJoin('medication.user', 'user')
      .where('log.scheduledTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (userId) {
      queryBuilder.andWhere('user.id = :userId', { userId });
    }

    const logs = await queryBuilder.getMany();

    const totalScheduled = logs.length;
    const totalTaken = logs.filter((log) => log.status === 'TAKEN').length;
    const totalMissed = logs.filter((log) => log.status === 'MISSED').length;
    const totalSkipped = logs.filter((log) => log.status === 'SKIPPED').length;

    const adherenceRate =
      totalScheduled > 0 ? ((totalTaken / totalScheduled) * 100).toFixed(2) : 0;

    // Adherencia por medicamento
    const byMedication = await this.logRepository
      .createQueryBuilder('log')
      .leftJoin('log.schedule', 'schedule')
      .leftJoin('schedule.medication', 'medication')
      .select('medication.id', 'medicationId')
      .addSelect('medication.name', 'medicationName')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN log.status = 'TAKEN' THEN 1 ELSE 0 END)",
        'taken',
      )
      .where('log.scheduledTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('medication.id')
      .addGroupBy('medication.name')
      .getRawMany();

    // Tendencia diaria
    const dailyTrend = await this.logRepository
      .createQueryBuilder('log')
      .select("DATE_TRUNC('day', log.scheduledTime)", 'date')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN log.status = 'TAKEN' THEN 1 ELSE 0 END)",
        'taken',
      )
      .where('log.scheduledTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE_TRUNC('day', log.scheduledTime)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      period: query.period,
      startDate,
      endDate,
      summary: {
        totalScheduled,
        totalTaken,
        totalMissed,
        totalSkipped,
        adherenceRate: parseFloat(adherenceRate as string),
      },
      byMedication: byMedication.map((item) => ({
        medicationId: item.medicationId,
        medicationName: item.medicationName,
        total: parseInt(item.total),
        taken: parseInt(item.taken),
        adherenceRate:
          item.total > 0
            ? ((parseInt(item.taken) / parseInt(item.total)) * 100).toFixed(2)
            : 0,
      })),
      dailyTrend: dailyTrend.map((item) => ({
        date: item.date,
        total: parseInt(item.total),
        taken: parseInt(item.taken),
        adherenceRate:
          item.total > 0
            ? ((parseInt(item.taken) / parseInt(item.total)) * 100).toFixed(2)
            : 0,
      })),
    };
  }

  /**
   * Obtener reporte de caídas
   */
  async getFallsReport(query: ReportQueryDto): Promise<any> {
    const { startDate, endDate, userId } = this.getDateRange(query);

    const queryBuilder = this.fallRepository
      .createQueryBuilder('fall')
      .leftJoin('fall.user', 'user')
      .leftJoin('fall.device', 'device')
      .where('fall.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (userId) {
      queryBuilder.andWhere('user.id = :userId', { userId });
    }

    const falls = await queryBuilder.getMany();

    const total = falls.length;
    const bySeverity = falls.reduce((acc, fall) => {
      acc[fall.severity] = (acc[fall.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const falseAlarms = falls.filter((fall) => fall.falseAlarm).length;
    const confirmedFalls = total - falseAlarms;

    // Caídas por hora del día
    const byHourOfDay = await this.fallRepository
      .createQueryBuilder('fall')
      .select("EXTRACT(HOUR FROM fall.timestamp)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('fall.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Tendencia diaria
    const dailyTrend = await this.fallRepository
      .createQueryBuilder('fall')
      .select("DATE_TRUNC('day', fall.timestamp)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('fall.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE_TRUNC('day', fall.timestamp)")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Tiempo promedio de respuesta
    const responseTimeData = await this.fallRepository
      .createQueryBuilder('fall')
      .select(
        'AVG(EXTRACT(EPOCH FROM (fall.respondedAt - fall.timestamp)))',
        'avgResponseTime',
      )
      .where('fall.respondedAt IS NOT NULL')
      .andWhere('fall.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      period: query.period,
      startDate,
      endDate,
      summary: {
        total,
        confirmedFalls,
        falseAlarms,
        falseAlarmRate:
          total > 0 ? ((falseAlarms / total) * 100).toFixed(2) : 0,
        bySeverity,
        avgResponseTimeSeconds: responseTimeData.avgResponseTime
          ? parseFloat(responseTimeData.avgResponseTime).toFixed(2)
          : null,
      },
      byHourOfDay: byHourOfDay.map((item) => ({
        hour: parseInt(item.hour),
        count: parseInt(item.count),
      })),
      dailyTrend: dailyTrend.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
      })),
    };
  }

  /**
   * Obtener reporte de actividad de dispositivos
   */
  async getDeviceActivityReport(query: ReportQueryDto): Promise<any> {
    const { startDate, endDate, userId } = this.getDateRange(query);

    const queryBuilder = this.deviceRepository
      .createQueryBuilder('device')
      .leftJoin('device.owner', 'owner');

    if (userId) {
      queryBuilder.where('owner.id = :userId', { userId });
    }

    const devices = await queryBuilder.getMany();

    const total = devices.length;
    const byType = devices.reduce((acc, device) => {
      acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = devices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byHealth = devices.reduce((acc, device) => {
      acc[device.healthStatus] = (acc[device.healthStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Dispositivos online (heartbeat en los últimos 5 minutos)
    const online = devices.filter((device) => {
      if (!device.lastHeartbeat) return false;
      const lastHeartbeat = new Date(device.lastHeartbeat);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastHeartbeat.getTime()) / 1000 / 60;
      return diffMinutes < 5;
    }).length;

    // Nivel promedio de batería
    const batteryLevels = devices
      .filter((d) => d.batteryLevel !== null)
      .map((d) => d.batteryLevel);
    const avgBatteryLevel =
      batteryLevels.length > 0
        ? (
            batteryLevels.reduce((a, b) => a + b, 0) / batteryLevels.length
          ).toFixed(2)
        : null;

    // Dispositivos con batería baja (< 20%)
    const lowBattery = devices.filter(
      (d) => d.batteryLevel !== null && d.batteryLevel < 20,
    ).length;

    return {
      period: query.period,
      startDate,
      endDate,
      summary: {
        total,
        online,
        offline: total - online,
        onlinePercentage: total > 0 ? ((online / total) * 100).toFixed(2) : 0,
        avgBatteryLevel: avgBatteryLevel ? parseFloat(avgBatteryLevel) : null,
        lowBattery,
        byType,
        byStatus,
        byHealth,
      },
      devices: devices.map((device) => ({
        id: device.id,
        deviceType: device.deviceType,
        serialNumber: device.serialNumber,
        name: device.name,
        status: device.status,
        healthStatus: device.healthStatus,
        batteryLevel: device.batteryLevel,
        lastHeartbeat: device.lastHeartbeat,
        firmwareVersion: device.firmwareVersion,
      })),
    };
  }

  /**
   * Obtener dashboard general
   */
  async getDashboard(userId?: string): Promise<any> {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const query: ReportQueryDto = {
      period: ReportPeriod.MONTHLY,
      startDate: last30Days.toISOString(),
      endDate: now.toISOString(),
      userId,
    };

    const [medicationAdherence, falls, deviceActivity] = await Promise.all([
      this.getMedicationAdherenceReport(query),
      this.getFallsReport(query),
      this.getDeviceActivityReport(query),
    ]);

    return {
      generatedAt: now,
      period: 'last30Days',
      medicationAdherence: medicationAdherence.summary,
      falls: falls.summary,
      devices: deviceActivity.summary,
    };
  }

  /**
   * Exportar reporte
   */
  async exportReport(exportDto: ExportReportDto): Promise<any> {
    const query: ReportQueryDto = {
      period: exportDto.period,
      startDate: exportDto.startDate,
      endDate: exportDto.endDate,
      userId: exportDto.userId,
    };

    let reportData: any;

    switch (exportDto.reportType) {
      case 'MEDICATION_ADHERENCE':
        reportData = await this.getMedicationAdherenceReport(query);
        break;
      case 'FALLS':
        reportData = await this.getFallsReport(query);
        break;
      case 'DEVICE_ACTIVITY':
        reportData = await this.getDeviceActivityReport(query);
        break;
      case 'GENERAL_DASHBOARD':
        reportData = await this.getDashboard(exportDto.userId);
        break;
      default:
        throw new BadRequestException('Tipo de reporte no válido');
    }

    // En producción, aquí generaríamos el PDF o CSV
    // usando librerías como pdfkit, jspdf, o csv-writer

    return {
      reportType: exportDto.reportType,
      format: exportDto.format,
      generatedAt: new Date(),
      data: reportData,
      // downloadUrl: 'https://cdn.eldercare.com/reports/...' // URL del archivo generado
    };
  }

  /**
   * Obtener datos de series temporales
   */
  async getTimeSeriesData(query: TimeSeriesQueryDto): Promise<any> {
    const { deviceId, startDate, endDate, metric, interval } = query;

    // En producción, esto consultaría la tabla device_telemetry
    // que almacena series temporales en TimescaleDB

    // Por ahora retornamos datos simulados
    return {
      metric,
      deviceId,
      startDate,
      endDate,
      interval,
      dataPoints: [
        // Datos de ejemplo
        { timestamp: '2024-01-01T00:00:00Z', value: 85 },
        { timestamp: '2024-01-01T01:00:00Z', value: 84 },
        { timestamp: '2024-01-01T02:00:00Z', value: 83 },
      ],
    };
  }

  /**
   * Obtener rango de fechas basado en el período
   */
  private getDateRange(query: ReportQueryDto): {
    startDate: Date;
    endDate: Date;
    userId?: string;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.period) {
        case ReportPeriod.DAILY:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case ReportPeriod.WEEKLY:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case ReportPeriod.MONTHLY:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case ReportPeriod.QUARTERLY:
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case ReportPeriod.YEARLY:
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return {
      startDate,
      endDate,
      userId: query.userId,
    };
  }
}
