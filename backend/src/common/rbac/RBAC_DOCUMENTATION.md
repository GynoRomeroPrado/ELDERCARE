# Sistema de Control de Acceso Basado en Roles (RBAC)

## Descripción General

ELDERCARE+ implementa un sistema completo de Control de Acceso Basado en Roles (RBAC) que combina autenticación JWT, verificación de roles y permisos granulares.

## Roles del Sistema

### 1. ADMIN
- **Descripción**: Administrador del sistema
- **Permisos**: Acceso completo a todos los recursos
- **Casos de uso**: Gestión de plataforma, configuración del sistema

### 2. HEALTHCARE_PROVIDER
- **Descripción**: Proveedor de servicios de salud (médicos, enfermeras)
- **Permisos**:
  - ✅ Crear, leer, actualizar y eliminar medicamentos
  - ✅ Ver información de usuarios y dispositivos
  - ✅ Responder a alertas de caídas
  - ✅ Acceso completo a analytics y reportes
  - ✅ Chat y calendario familiar
  - ❌ No puede crear/eliminar usuarios
  - ❌ No puede crear/eliminar dispositivos

### 3. CAREGIVER
- **Descripción**: Cuidador profesional o familiar designado
- **Permisos**:
  - ✅ Ver medicamentos (no modificar)
  - ✅ Ver información de usuarios y dispositivos
  - ✅ Responder a alertas de caídas
  - ✅ Crear y gestionar alertas personalizadas
  - ✅ Ver analytics básicos
  - ✅ Chat y calendario familiar
  - ❌ No puede modificar medicamentos
  - ❌ No puede exportar reportes

### 4. FAMILY_MEMBER
- **Descripción**: Miembro de la familia
- **Permisos**:
  - ✅ Ver información básica
  - ✅ Ver estado de dispositivos
  - ✅ Ver alertas de caídas
  - ✅ Crear alertas personalizadas
  - ✅ Chat y calendario familiar
  - ❌ No puede responder a caídas
  - ❌ Analytics limitados
  - ❌ No puede modificar medicamentos

### 5. ELDER
- **Descripción**: Adulto mayor (usuario principal)
- **Permisos**:
  - ✅ Ver su propia información
  - ✅ Actualizar su perfil
  - ✅ Ver sus dispositivos
  - ✅ Ver sus medicamentos
  - ✅ Ver alertas
  - ✅ Chat familiar (lectura y escritura)
  - ✅ Calendario (solo lectura)
  - ❌ No puede ver analytics
  - ❌ No puede modificar medicamentos
  - ❌ No puede gestionar alertas

## Decoradores Disponibles

### @Public()
Marca un endpoint como público (sin autenticación requerida).

```typescript
@Public()
@Get('health')
async healthCheck() {
  return { status: 'ok' };
}
```

### @Roles(...roles)
Requiere que el usuario tenga uno de los roles especificados.

```typescript
@Roles(UserRole.ADMIN, UserRole.HEALTHCARE_PROVIDER)
@Post('medications')
async createMedication(@Body() dto: CreateMedicationDto) {
  // Solo ADMIN y HEALTHCARE_PROVIDER pueden acceder
}
```

### @RequirePermissions(...permissions)
Requiere que el usuario tenga todos los permisos especificados.

```typescript
@RequirePermissions(Permission.ANALYTICS_EXPORT)
@Post('analytics/export')
async exportReport(@Body() dto: ExportReportDto) {
  // Solo usuarios con permiso analytics:export
}
```

### @CurrentUser()
Extrae el usuario actual del request.

```typescript
@Get('profile')
async getProfile(@CurrentUser() user: any) {
  return user;
}

@Get('email')
async getEmail(@CurrentUser('email') email: string) {
  return { email };
}
```

## Guards Disponibles

### JwtAuthGuard
- **Propósito**: Autenticación JWT global
- **Aplicación**: Aplicado globalmente en `main.ts`
- **Bypass**: Usar `@Public()` para endpoints públicos

### RolesGuard
- **Propósito**: Verificación de roles
- **Uso**: Automático cuando se usa `@Roles()`
- **Lógica**: ADMIN siempre tiene acceso; otros roles deben coincidir

### PermissionsGuard
- **Propósito**: Verificación de permisos granulares
- **Uso**: Automático cuando se usa `@RequirePermissions()`
- **Lógica**: Usuario debe tener TODOS los permisos requeridos

## Permisos por Categoría

### Usuarios
- `user:create` - Crear usuarios
- `user:read` - Ver usuarios
- `user:update` - Actualizar usuarios
- `user:delete` - Eliminar usuarios

### Dispositivos
- `device:create` - Registrar dispositivos
- `device:read` - Ver dispositivos
- `device:update` - Actualizar dispositivos
- `device:delete` - Eliminar dispositivos

### Medicamentos
- `medication:create` - Crear medicamentos
- `medication:read` - Ver medicamentos
- `medication:update` - Actualizar medicamentos
- `medication:delete` - Eliminar medicamentos

### Caídas
- `fall:read` - Ver alertas de caídas
- `fall:respond` - Responder a caídas
- `fall:delete` - Eliminar registros de caídas

### Alertas
- `alert:create` - Crear configuraciones de alertas
- `alert:read` - Ver alertas
- `alert:update` - Actualizar alertas
- `alert:delete` - Eliminar alertas

### Analytics
- `analytics:view` - Ver dashboards y reportes
- `analytics:export` - Exportar reportes (PDF/CSV)

### Chat
- `chat:read` - Ver mensajes
- `chat:write` - Enviar mensajes

### Calendario
- `calendar:read` - Ver eventos
- `calendar:write` - Crear/modificar eventos

## Ejemplos de Uso

### Endpoint Solo para Administradores

```typescript
@Roles(UserRole.ADMIN)
@Post('users')
async createUser(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

### Endpoint con Múltiples Roles

```typescript
@Roles(UserRole.ADMIN, UserRole.HEALTHCARE_PROVIDER, UserRole.CAREGIVER)
@Get('falls')
async getFalls(@Query() query: FallQueryDto) {
  return this.fallsService.findAll(query);
}
```

### Endpoint con Permisos Específicos

```typescript
@RequirePermissions(Permission.MEDICATION_CREATE, Permission.MEDICATION_UPDATE)
@Put('medications/:id')
async updateMedication(
  @Param('id') id: string,
  @Body() dto: UpdateMedicationDto,
) {
  return this.medicationsService.update(id, dto);
}
```

### Endpoint con Verificación de Propietario

```typescript
@Get('medications')
async getUserMedications(@CurrentUser() user: any, @Query('userId') userId?: string) {
  // Si es ADMIN o HEALTHCARE_PROVIDER, puede ver medicamentos de cualquier usuario
  if (user.role === UserRole.ADMIN || user.role === UserRole.HEALTHCARE_PROVIDER) {
    return this.medicationsService.findByUser(userId || user.id);
  }

  // Otros roles solo pueden ver sus propios medicamentos
  return this.medicationsService.findByUser(user.id);
}
```

### Endpoint Público

```typescript
@Public()
@Post('auth/login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

## Configuración Global

Para aplicar los guards globalmente, agregar en `main.ts`:

```typescript
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const reflector = app.get(Reflector);

  // Aplicar guards globales
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
    new PermissionsGuard(reflector),
  );

  await app.listen(3000);
}
```

## Matriz de Permisos por Rol

| Permiso | ADMIN | HEALTHCARE | CAREGIVER | FAMILY | ELDER |
|---------|-------|------------|-----------|--------|-------|
| user:create | ✅ | ❌ | ❌ | ❌ | ❌ |
| user:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| user:update | ✅ | ❌ | ❌ | ❌ | ✅* |
| user:delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| device:create | ✅ | ❌ | ❌ | ❌ | ❌ |
| device:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| device:update | ✅ | ❌ | ❌ | ❌ | ❌ |
| device:delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| medication:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| medication:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| medication:update | ✅ | ✅ | ❌ | ❌ | ❌ |
| medication:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| fall:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| fall:respond | ✅ | ✅ | ✅ | ❌ | ❌ |
| fall:delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| alert:create | ✅ | ❌ | ✅ | ✅ | ❌ |
| alert:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| alert:update | ✅ | ❌ | ✅ | ❌ | ❌ |
| alert:delete | ✅ | ❌ | ✅ | ❌ | ❌ |
| analytics:view | ✅ | ✅ | ✅ | ✅ | ❌ |
| analytics:export | ✅ | ✅ | ❌ | ❌ | ❌ |
| chat:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| chat:write | ✅ | ✅ | ✅ | ✅ | ✅ |
| calendar:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| calendar:write | ✅ | ✅ | ✅ | ✅ | ❌ |

*ELDER puede actualizar solo su propio perfil

## Seguridad

### Mejores Prácticas

1. **Principio de Menor Privilegio**: Asignar solo los permisos necesarios
2. **Verificación de Propietario**: Además de roles, verificar que el usuario tenga acceso al recurso específico
3. **Auditoría**: Registrar accesos a recursos sensibles
4. **Tokens**: Usar JWT con expiración corta y refresh tokens
5. **HTTPS**: Siempre usar HTTPS en producción

### Ejemplo de Verificación de Propietario

```typescript
@Put('profile/:id')
async updateProfile(
  @Param('id') id: string,
  @CurrentUser() user: any,
  @Body() dto: UpdateProfileDto,
) {
  // ADMIN puede editar cualquier perfil
  if (user.role === UserRole.ADMIN) {
    return this.usersService.update(id, dto);
  }

  // Otros usuarios solo pueden editar su propio perfil
  if (user.id !== id) {
    throw new ForbiddenException('No tienes permiso para editar este perfil');
  }

  return this.usersService.update(id, dto);
}
```

## Testing

### Ejemplo de Test con RBAC

```typescript
describe('UsersController', () => {
  it('should allow ADMIN to create users', async () => {
    const admin = { id: 'admin-1', role: UserRole.ADMIN };
    const dto = { email: 'test@test.com', role: UserRole.ELDER };

    const result = await controller.create(dto, admin);
    expect(result).toBeDefined();
  });

  it('should deny FAMILY_MEMBER to create users', async () => {
    const family = { id: 'family-1', role: UserRole.FAMILY_MEMBER };
    const dto = { email: 'test@test.com', role: UserRole.ELDER };

    await expect(controller.create(dto, family)).rejects.toThrow(ForbiddenException);
  });
});
```

## Conclusión

Este sistema RBAC proporciona:
- ✅ Autenticación JWT robusta
- ✅ Control de acceso basado en roles
- ✅ Permisos granulares por recurso
- ✅ Decoradores intuitivos
- ✅ Guards reutilizables
- ✅ Fácil extensión y mantenimiento
