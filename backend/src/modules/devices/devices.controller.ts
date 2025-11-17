/**
 * Controlador de Dispositivos
 * API REST para gestión de dispositivos IoT
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
  UseGuards,
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
import { DevicesService } from './devices.service';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceTelemetryDto,
  DeviceQueryDto,
  FirmwareUpdateDto,
} from './dto/devices.dto';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar nuevo dispositivo',
    description: 'Registra un nuevo dispositivo IoT en el sistema',
  })
  @ApiResponse({ status: 201, description: 'Dispositivo registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'El número de serie ya existe' })
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos los dispositivos',
    description: 'Obtiene lista paginada de dispositivos con filtros',
  })
  @ApiResponse({ status: 200, description: 'Lista de dispositivos' })
  async findAll(@Query() query: DeviceQueryDto) {
    return this.devicesService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Estadísticas de dispositivos',
    description: 'Estadísticas: total, online, por tipo, por estado, etc.',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStatistics(@Query('ownerId') ownerId?: string) {
    return this.devicesService.getStatistics(ownerId);
  }

  @Get('offline')
  @ApiOperation({
    summary: 'Listar dispositivos offline',
    description: 'Obtiene dispositivos que no han enviado heartbeat recientemente',
  })
  @ApiResponse({ status: 200, description: 'Lista de dispositivos offline' })
  async findOfflineDevices(@Query('minutes') minutes: number = 15) {
    return this.devicesService.findOfflineDevices(minutes);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener dispositivo por ID',
    description: 'Información detallada de un dispositivo específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del dispositivo' })
  @ApiResponse({ status: 200, description: 'Dispositivo encontrado' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Get(':id/health')
  @ApiOperation({
    summary: 'Obtener estado de salud del dispositivo',
    description: 'Estado de salud, batería, conectividad, métricas',
  })
  @ApiResponse({ status: 200, description: 'Estado de salud obtenido' })
  async getHealth(@Param('id') id: string) {
    return this.devicesService.getHealth(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar dispositivo',
    description: 'Actualiza configuración de un dispositivo',
  })
  @ApiResponse({ status: 200, description: 'Dispositivo actualizado' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Post(':id/heartbeat')
  @ApiOperation({
    summary: 'Actualizar heartbeat',
    description: 'Dispositivo reporta que está activo',
  })
  @ApiResponse({ status: 200, description: 'Heartbeat actualizado' })
  @HttpCode(HttpStatus.OK)
  async updateHeartbeat(@Param('id') id: string) {
    await this.devicesService.updateHeartbeat(id);
    return { message: 'Heartbeat actualizado' };
  }

  @Post(':id/telemetry')
  @ApiOperation({
    summary: 'Registrar telemetría',
    description: 'Dispositivo envía datos de telemetría (batería, señal, temperatura, etc.)',
  })
  @ApiResponse({ status: 201, description: 'Telemetría registrada' })
  async recordTelemetry(@Param('id') id: string, @Body() telemetryDto: DeviceTelemetryDto) {
    await this.devicesService.recordTelemetry(id, telemetryDto);
    return { message: 'Telemetría registrada exitosamente' };
  }

  @Post(':id/firmware-update')
  @ApiOperation({
    summary: 'Iniciar actualización de firmware',
    description: 'Inicia proceso OTA de actualización de firmware',
  })
  @ApiResponse({ status: 200, description: 'Actualización iniciada' })
  @HttpCode(HttpStatus.OK)
  async startFirmwareUpdate(
    @Param('id') id: string,
    @Body() firmwareDto: FirmwareUpdateDto,
  ) {
    await this.devicesService.startFirmwareUpdate(id, firmwareDto);
    return { message: 'Actualización de firmware iniciada' };
  }

  @Post(':id/firmware-confirm')
  @ApiOperation({
    summary: 'Confirmar actualización de firmware',
    description: 'Dispositivo confirma que la actualización fue exitosa',
  })
  @ApiResponse({ status: 200, description: 'Actualización confirmada' })
  @HttpCode(HttpStatus.OK)
  async confirmFirmwareUpdate(
    @Param('id') id: string,
    @Body() body: { version: string },
  ) {
    await this.devicesService.confirmFirmwareUpdate(id, body.version);
    return { message: 'Actualización de firmware confirmada' };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar dispositivo',
    description: 'Elimina un dispositivo permanentemente del sistema',
  })
  @ApiResponse({ status: 200, description: 'Dispositivo eliminado' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async remove(@Param('id') id: string) {
    await this.devicesService.remove(id);
    return { message: 'Dispositivo eliminado exitosamente' };
  }
}
