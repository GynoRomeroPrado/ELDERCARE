/**
 * Ejemplo de Controller con RBAC completo
 * Demuestra el uso de todos los decoradores y guards
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
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions, Permission } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole } from '../../modules/users/dto/users.dto';

@ApiTags('rbac-examples')
@Controller('examples')
export class RbacExampleController {
  /**
   * Ejemplo 1: Endpoint público (sin autenticación)
   */
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Endpoint público (no requiere autenticación)' })
  @ApiResponse({ status: 200, description: 'Acceso permitido para todos' })
  getPublicData() {
    return {
      message: 'Este endpoint es público, no requiere autenticación',
    };
  }

  /**
   * Ejemplo 2: Endpoint protegido (requiere autenticación)
   */
  @Get('protected')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint protegido (requiere autenticación)' })
  @ApiResponse({ status: 200, description: 'Usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  getProtectedData(@CurrentUser() user: any) {
    return {
      message: 'Este endpoint requiere autenticación',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Ejemplo 3: Solo para Administradores
   */
  @Roles(UserRole.ADMIN)
  @Post('admin-only')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Solo para administradores' })
  @ApiResponse({ status: 201, description: 'Operación exitosa' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  adminOnlyOperation(@CurrentUser() user: any) {
    return {
      message: 'Solo los administradores pueden acceder a este endpoint',
      admin: user.email,
    };
  }

  /**
   * Ejemplo 4: Múltiples roles permitidos
   */
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_PROVIDER, UserRole.CAREGIVER)
  @Get('medical-staff')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Para personal médico y cuidadores',
    description: 'Acceso permitido para ADMIN, HEALTHCARE_PROVIDER y CAREGIVER',
  })
  getMedicalData(@CurrentUser() user: any) {
    return {
      message: 'Datos disponibles para personal médico y cuidadores',
      role: user.role,
    };
  }

  /**
   * Ejemplo 5: Permisos específicos
   */
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  @Get('analytics')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ver analytics',
    description: 'Requiere permiso analytics:view',
  })
  viewAnalytics(@CurrentUser() user: any) {
    return {
      message: 'Analytics disponible para usuarios con permiso',
      hasPermission: true,
    };
  }

  /**
   * Ejemplo 6: Múltiples permisos requeridos
   */
  @RequirePermissions(Permission.ANALYTICS_VIEW, Permission.ANALYTICS_EXPORT)
  @Post('analytics/export')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Exportar reportes',
    description: 'Requiere permisos analytics:view y analytics:export',
  })
  @HttpCode(HttpStatus.OK)
  exportReport(@CurrentUser() user: any) {
    return {
      message: 'Reporte exportado exitosamente',
      exportedBy: user.email,
    };
  }

  /**
   * Ejemplo 7: Verificación de propietario
   */
  @Put('profile/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar perfil',
    description: 'Solo el propietario o ADMIN puede actualizar',
  })
  updateProfile(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    // ADMIN puede editar cualquier perfil
    if (user.role === UserRole.ADMIN) {
      return {
        message: 'Perfil actualizado por administrador',
        profileId: id,
        updatedBy: user.email,
      };
    }

    // Verificar que el usuario esté actualizando su propio perfil
    if (user.id !== id) {
      throw new ForbiddenException(
        'No tienes permiso para editar este perfil',
      );
    }

    return {
      message: 'Perfil actualizado exitosamente',
      profileId: id,
    };
  }

  /**
   * Ejemplo 8: Lógica condicional por rol
   */
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'ADMIN ve todos, otros ven solo familia',
  })
  getUsers(@CurrentUser() user: any, @Query('filter') filter?: string) {
    if (user.role === UserRole.ADMIN) {
      return {
        message: 'Mostrando todos los usuarios (Admin)',
        count: 100,
        users: ['user1', 'user2', 'user3'],
      };
    }

    if (user.role === UserRole.HEALTHCARE_PROVIDER) {
      return {
        message: 'Mostrando pacientes asignados',
        count: 20,
        users: ['patient1', 'patient2'],
      };
    }

    // FAMILY_MEMBER y CAREGIVER ven solo su grupo familiar
    return {
      message: 'Mostrando miembros de la familia',
      count: 5,
      users: ['elder1', 'caregiver1'],
    };
  }

  /**
   * Ejemplo 9: Extracción de datos específicos del usuario
   */
  @Get('my-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener email del usuario actual' })
  getMyEmail(@CurrentUser('email') email: string) {
    return {
      email,
      message: 'Email extraído directamente con @CurrentUser("email")',
    };
  }

  /**
   * Ejemplo 10: Combinación de roles y permisos
   */
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_PROVIDER)
  @RequirePermissions(Permission.MEDICATION_CREATE)
  @Post('medications')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear medicamento',
    description: 'Requiere rol apropiado Y permiso medication:create',
  })
  createMedication(@CurrentUser() user: any, @Body() data: any) {
    return {
      message: 'Medicamento creado exitosamente',
      createdBy: user.email,
      role: user.role,
    };
  }

  /**
   * Ejemplo 11: Endpoint con diferentes respuestas por rol
   */
  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard personalizado por rol' })
  getDashboard(@CurrentUser() user: any) {
    const dashboards: Record<UserRole, any> = {
      [UserRole.ADMIN]: {
        type: 'admin',
        widgets: [
          'users-stats',
          'devices-stats',
          'system-health',
          'revenue',
        ],
      },
      [UserRole.HEALTHCARE_PROVIDER]: {
        type: 'healthcare',
        widgets: ['patients-list', 'appointments', 'medications', 'alerts'],
      },
      [UserRole.CAREGIVER]: {
        type: 'caregiver',
        widgets: ['elder-status', 'tasks', 'medications', 'falls-alerts'],
      },
      [UserRole.FAMILY_MEMBER]: {
        type: 'family',
        widgets: ['elder-health', 'recent-activities', 'chat', 'calendar'],
      },
      [UserRole.ELDER]: {
        type: 'elder',
        widgets: ['my-medications', 'upcoming-appointments', 'family-chat'],
      },
    };

    return {
      dashboard: dashboards[user.role],
      user: {
        name: user.firstName + ' ' + user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Ejemplo 12: Operación crítica con múltiples validaciones
   */
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_PROVIDER)
  @RequirePermissions(Permission.FALL_RESPOND)
  @Post('falls/:id/respond')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Responder a alerta de caída',
    description:
      'Operación crítica que requiere rol apropiado y permiso específico',
  })
  @HttpCode(HttpStatus.OK)
  respondToFall(
    @Param('id') fallId: string,
    @CurrentUser() user: any,
    @Body() response: any,
  ) {
    return {
      message: 'Respuesta a caída registrada',
      fallId,
      respondedBy: user.email,
      role: user.role,
      timestamp: new Date(),
    };
  }
}
