/**
 * Controlador de Analytics
 * API REST para reportes y análisis de datos
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  ReportQueryDto,
  ExportReportDto,
  TimeSeriesQueryDto,
} from './dto/analytics.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('medication-adherence')
  @ApiOperation({
    summary: 'Reporte de adherencia a medicamentos',
    description:
      'Estadísticas de adherencia: tasa de adherencia, medicamentos tomados vs perdidos, tendencias',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de adherencia generado',
  })
  async getMedicationAdherence(@Query() query: ReportQueryDto) {
    return this.analyticsService.getMedicationAdherenceReport(query);
  }

  @Get('falls')
  @ApiOperation({
    summary: 'Reporte de caídas',
    description:
      'Estadísticas de caídas: total, severidad, falsas alarmas, tiempo de respuesta, tendencias',
  })
  @ApiResponse({ status: 200, description: 'Reporte de caídas generado' })
  async getFalls(@Query() query: ReportQueryDto) {
    return this.analyticsService.getFallsReport(query);
  }

  @Get('devices')
  @ApiOperation({
    summary: 'Reporte de actividad de dispositivos',
    description:
      'Estadísticas de dispositivos: online/offline, batería, salud, por tipo',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de dispositivos generado',
  })
  async getDevices(@Query() query: ReportQueryDto) {
    return this.analyticsService.getDeviceActivityReport(query);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard general',
    description:
      'Dashboard con resumen de todas las métricas principales (últimos 30 días)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard generado' })
  async getDashboard(@Query('userId') userId?: string) {
    return this.analyticsService.getDashboard(userId);
  }

  @Post('export')
  @ApiOperation({
    summary: 'Exportar reporte',
    description: 'Genera y exporta un reporte en formato PDF, CSV o JSON',
  })
  @ApiResponse({ status: 200, description: 'Reporte exportado' })
  @HttpCode(HttpStatus.OK)
  async exportReport(@Body() exportDto: ExportReportDto) {
    return this.analyticsService.exportReport(exportDto);
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'Datos de series temporales',
    description:
      'Obtiene datos de telemetría históricos de dispositivos (batería, señal, temperatura, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Datos de series temporales' })
  async getTimeSeries(@Query() query: TimeSeriesQueryDto) {
    return this.analyticsService.getTimeSeriesData(query);
  }
}
