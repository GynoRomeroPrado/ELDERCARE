/**
 * Decorador @RequirePermissions()
 * Define los permisos requeridos para un endpoint
 */

import { SetMetadata } from '@nestjs/common';

export enum Permission {
  // Usuarios
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Dispositivos
  DEVICE_CREATE = 'device:create',
  DEVICE_READ = 'device:read',
  DEVICE_UPDATE = 'device:update',
  DEVICE_DELETE = 'device:delete',

  // Medicamentos
  MEDICATION_CREATE = 'medication:create',
  MEDICATION_READ = 'medication:read',
  MEDICATION_UPDATE = 'medication:update',
  MEDICATION_DELETE = 'medication:delete',

  // Caídas
  FALL_READ = 'fall:read',
  FALL_RESPOND = 'fall:respond',
  FALL_DELETE = 'fall:delete',

  // Alertas
  ALERT_CREATE = 'alert:create',
  ALERT_READ = 'alert:read',
  ALERT_UPDATE = 'alert:update',
  ALERT_DELETE = 'alert:delete',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Chat
  CHAT_READ = 'chat:read',
  CHAT_WRITE = 'chat:write',

  // Calendario
  CALENDAR_READ = 'calendar:read',
  CALENDAR_WRITE = 'calendar:write',
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
