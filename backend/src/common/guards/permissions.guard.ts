/**
 * PermissionsGuard
 * Verifica que el usuario tenga todos los permisos requeridos
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, Permission } from '../decorators/permissions.decorator';
import { UserRole } from '../../modules/users/dto/users.dto';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // Mapa de roles a permisos
  private rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: Object.values(Permission), // Admin tiene todos los permisos

    [UserRole.HEALTHCARE_PROVIDER]: [
      Permission.USER_READ,
      Permission.DEVICE_READ,
      Permission.MEDICATION_CREATE,
      Permission.MEDICATION_READ,
      Permission.MEDICATION_UPDATE,
      Permission.MEDICATION_DELETE,
      Permission.FALL_READ,
      Permission.FALL_RESPOND,
      Permission.ALERT_READ,
      Permission.ANALYTICS_VIEW,
      Permission.ANALYTICS_EXPORT,
      Permission.CHAT_READ,
      Permission.CHAT_WRITE,
      Permission.CALENDAR_READ,
      Permission.CALENDAR_WRITE,
    ],

    [UserRole.CAREGIVER]: [
      Permission.USER_READ,
      Permission.DEVICE_READ,
      Permission.MEDICATION_READ,
      Permission.FALL_READ,
      Permission.FALL_RESPOND,
      Permission.ALERT_READ,
      Permission.ALERT_CREATE,
      Permission.ANALYTICS_VIEW,
      Permission.CHAT_READ,
      Permission.CHAT_WRITE,
      Permission.CALENDAR_READ,
      Permission.CALENDAR_WRITE,
    ],

    [UserRole.FAMILY_MEMBER]: [
      Permission.USER_READ,
      Permission.DEVICE_READ,
      Permission.MEDICATION_READ,
      Permission.FALL_READ,
      Permission.ALERT_READ,
      Permission.ALERT_CREATE,
      Permission.ANALYTICS_VIEW,
      Permission.CHAT_READ,
      Permission.CHAT_WRITE,
      Permission.CALENDAR_READ,
      Permission.CALENDAR_WRITE,
    ],

    [UserRole.ELDER]: [
      Permission.USER_READ,
      Permission.USER_UPDATE, // Puede actualizar su propio perfil
      Permission.DEVICE_READ,
      Permission.MEDICATION_READ,
      Permission.FALL_READ,
      Permission.ALERT_READ,
      Permission.CHAT_READ,
      Permission.CHAT_WRITE,
      Permission.CALENDAR_READ,
    ],
  };

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No hay permisos requeridos
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false; // No hay usuario autenticado
    }

    // Obtener permisos del rol del usuario
    const userPermissions = this.rolePermissions[user.role] || [];

    // Verificar que el usuario tenga TODOS los permisos requeridos
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
