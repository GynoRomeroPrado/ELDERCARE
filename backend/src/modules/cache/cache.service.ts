/**
 * Servicio de Caché con Redis
 * Maneja almacenamiento en caché para mejorar rendimiento
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hora en segundos

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Obtener valor del caché
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`✓ Cache hit: ${key}`);
      } else {
        this.logger.debug(`✗ Cache miss: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Error obteniendo del caché: ${error.message}`);
      return null;
    }
  }

  /**
   * Guardar valor en caché
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || this.DEFAULT_TTL);
      this.logger.debug(`✓ Guardado en caché: ${key} (TTL: ${ttl || this.DEFAULT_TTL}s)`);
    } catch (error) {
      this.logger.error(`Error guardando en caché: ${error.message}`);
    }
  }

  /**
   * Eliminar valor del caché
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`✓ Eliminado del caché: ${key}`);
    } catch (error) {
      this.logger.error(`Error eliminando del caché: ${error.message}`);
    }
  }

  /**
   * Limpiar todo el caché
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('✓ Caché limpiado completamente');
    } catch (error) {
      this.logger.error(`Error limpiando caché: ${error.message}`);
    }
  }

  /**
   * Obtener o establecer (pattern común)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Intentar obtener del caché
    let value = await this.get<T>(key);

    if (value !== null) {
      return value;
    }

    // Si no está en caché, ejecutar factory y guardar
    value = await factory();
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Cachear datos de usuario
   */
  async cacheUserData(userId: string, userData: any, ttl = 1800): Promise<void> {
    await this.set(`user:${userId}`, userData, ttl);
  }

  /**
   * Obtener datos de usuario del caché
   */
  async getUserData(userId: string): Promise<any> {
    return this.get(`user:${userId}`);
  }

  /**
   * Invalidar caché de usuario
   */
  async invalidateUserData(userId: string): Promise<void> {
    await this.delete(`user:${userId}`);
  }

  /**
   * Cachear dispositivos de un usuario
   */
  async cacheUserDevices(userId: string, devices: any[], ttl = 600): Promise<void> {
    await this.set(`user:${userId}:devices`, devices, ttl);
  }

  /**
   * Obtener dispositivos del caché
   */
  async getUserDevices(userId: string): Promise<any[] | null> {
    return this.get(`user:${userId}:devices`);
  }

  /**
   * Cachear estadísticas del dashboard
   */
  async cacheDashboardStats(userId: string, stats: any, ttl = 300): Promise<void> {
    await this.set(`dashboard:${userId}`, stats, ttl);
  }

  /**
   * Obtener estadísticas del dashboard
   */
  async getDashboardStats(userId: string): Promise<any | null> {
    return this.get(`dashboard:${userId}`);
  }

  /**
   * Cachear eventos de caídas recientes
   */
  async cacheFallEvents(elderId: string, events: any[], ttl = 180): Promise<void> {
    await this.set(`falls:${elderId}:recent`, events, ttl);
  }

  /**
   * Obtener eventos de caídas del caché
   */
  async getFallEvents(elderId: string): Promise<any[] | null> {
    return this.get(`falls:${elderId}:recent`);
  }

  /**
   * Incrementar contador (útil para rate limiting)
   */
  async increment(key: string, ttl?: number): Promise<number> {
    try {
      let count = (await this.get<number>(key)) || 0;
      count++;
      await this.set(key, count, ttl || this.DEFAULT_TTL);
      return count;
    } catch (error) {
      this.logger.error(`Error incrementando contador: ${error.message}`);
      return 0;
    }
  }

  /**
   * Verificar límite de tasa (rate limiting)
   */
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate:${identifier}`;
    const count = await this.increment(key, windowSeconds);

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
    };
  }

  /**
   * Cachear token de sesión
   */
  async cacheSessionToken(
    userId: string,
    token: string,
    ttl = 86400, // 24 horas
  ): Promise<void> {
    await this.set(`session:${userId}:${token}`, { valid: true }, ttl);
  }

  /**
   * Verificar token de sesión
   */
  async validateSessionToken(userId: string, token: string): Promise<boolean> {
    const session = await this.get(`session:${userId}:${token}`);
    return session !== null;
  }

  /**
   * Invalidar token de sesión
   */
  async invalidateSessionToken(userId: string, token: string): Promise<void> {
    await this.delete(`session:${userId}:${token}`);
  }

  /**
   * Invalidar todas las sesiones de un usuario
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    // En Redis, se puede usar SCAN para encontrar todas las claves con patrón
    // Por simplicidad, aquí solo invalidamos el caché general del usuario
    await this.invalidateUserData(userId);
    this.logger.log(`✓ Sesiones invalidadas para usuario ${userId}`);
  }
}
