/**
 * Controlador de Alertas
 * API REST para gestión de alertas personalizables
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import {
  CreateAlertConfigDto,
  UpdateAlertConfigDto,
  AlertQueryDto,
  TriggerAlertDto,
  ResolveAlertDto,
} from './dto/alerts.dto';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ==================== Configuración de Alertas ====================

  @Post('config')
  @ApiOperation({
    summary: 'Crear configuración de alerta',
    description: 'Crea una nueva configuración de alerta personalizable',
  })
  @ApiResponse({ status: 201, description: 'Configuración creada exitosamente' })
  async createConfig(@Body() createDto: CreateAlertConfigDto) {
    return this.alertsService.createConfig(createDto);
  }

  @Get('config')
  @ApiOperation({
    summary: 'Listar configuraciones de alertas',
    description: 'Obtiene todas las configuraciones de alertas con filtros',
  })
  @ApiResponse({ status: 200, description: 'Lista de configuraciones' })
  async findAllConfigs(@Query() query: AlertQueryDto) {
    return this.alertsService.findAllConfigs(query);
  }

  @Get('config/:id')
  @ApiOperation({
    summary: 'Obtener configuración por ID',
    description: 'Obtiene los detalles de una configuración de alerta',
  })
  @ApiParam({ name: 'id', description: 'UUID de la configuración' })
  @ApiResponse({ status: 200, description: 'Configuración encontrada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async findOneConfig(@Param('id') id: string) {
    return this.alertsService.findOneConfig(id);
  }

  @Put('config/:id')
  @ApiOperation({
    summary: 'Actualizar configuración de alerta',
    description: 'Actualiza una configuración de alerta existente',
  })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async updateConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateAlertConfigDto,
  ) {
    return this.alertsService.updateConfig(id, updateDto);
  }

  @Put('config/:id/toggle')
  @ApiOperation({
    summary: 'Habilitar/deshabilitar alerta',
    description: 'Activa o desactiva una configuración de alerta',
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @HttpCode(HttpStatus.OK)
  async toggleConfig(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.alertsService.toggleConfig(id, body.enabled);
  }

  @Delete('config/:id')
  @ApiOperation({
    summary: 'Eliminar configuración de alerta',
    description: 'Elimina una configuración de alerta permanentemente',
  })
  @ApiResponse({ status: 200, description: 'Configuración eliminada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async removeConfig(@Param('id') id: string) {
    await this.alertsService.removeConfig(id);
    return { message: 'Configuración eliminada exitosamente' };
  }

  // ==================== Historial de Alertas ====================

  @Get('history')
  @ApiOperation({
    summary: 'Obtener historial de alertas',
    description: 'Lista de todas las alertas disparadas con filtros',
  })
  @ApiResponse({ status: 200, description: 'Historial de alertas' })
  async getHistory(@Query() query: AlertQueryDto) {
    return this.alertsService.getHistory(query);
  }

  @Post('trigger')
  @ApiOperation({
    summary: 'Disparar una alerta manualmente',
    description: 'Dispara una alerta basada en una configuración existente',
  })
  @ApiResponse({ status: 201, description: 'Alerta disparada exitosamente' })
  async triggerAlert(@Body() triggerDto: TriggerAlertDto) {
    return this.alertsService.triggerAlert(triggerDto);
  }

  @Put('history/:id/resolve')
  @ApiOperation({
    summary: 'Resolver una alerta',
    description: 'Marca una alerta como resuelta con motivo opcional',
  })
  @ApiResponse({ status: 200, description: 'Alerta resuelta' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  @HttpCode(HttpStatus.OK)
  async resolveAlert(
    @Param('id') id: string,
    @Body() resolveDto: ResolveAlertDto,
  ) {
    return this.alertsService.resolveAlert(id, resolveDto);
  }

  // ==================== Estadísticas ====================

  @Get('statistics')
  @ApiOperation({
    summary: 'Estadísticas de alertas',
    description: 'Estadísticas: total, por tipo, por prioridad, tiempo de resolución',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStatistics(@Query('userId') userId?: string) {
    return this.alertsService.getStatistics(userId);
  }

  @Post('evaluate')
  @ApiOperation({
    summary: 'Evaluar condiciones de alertas',
    description:
      'Evalúa todas las condiciones de alertas activas y dispara las que cumplan (para uso interno/CRON)',
  })
  @ApiResponse({ status: 200, description: 'Condiciones evaluadas' })
  @HttpCode(HttpStatus.OK)
  async evaluateConditions() {
    await this.alertsService.evaluateConditions();
    return { message: 'Condiciones evaluadas exitosamente' };
  }
}
