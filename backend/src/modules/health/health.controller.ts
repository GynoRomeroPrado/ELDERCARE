/**
 * Módulo de Salud (Health Check)
 * Endpoint para verificar el estado del sistema
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    @InjectConnection() private connection: Connection,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Verificar salud del sistema',
    description: 'Verifica el estado de la base de datos, memoria y servicios críticos',
  })
  @ApiResponse({
    status: 200,
    description: 'Sistema saludable',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Sistema no saludable',
  })
  async check() {
    return this.health.check([
      // Verificar conexión a base de datos
      () => this.db.pingCheck('database', { timeout: 1000 }),

      // Verificar uso de memoria heap (máximo 150MB)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

      // Verificar uso de memoria RSS (máximo 300MB)
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Estado detallado del sistema',
    description: 'Información completa sobre el estado de todos los servicios',
  })
  async detailedCheck() {
    const dbConnection = this.connection.isConnected;
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      status: dbConnection ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: dbConnection ? 'connected' : 'disconnected',
          type: 'PostgreSQL',
        },
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        },
        process: {
          pid: process.pid,
          platform: process.platform,
          nodeVersion: process.version,
        },
      },
    };
  }
}
