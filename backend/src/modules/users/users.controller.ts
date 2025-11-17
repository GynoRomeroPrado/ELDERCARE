/**
 * Controlador de Usuarios
 * API REST para gestión de usuarios
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
  Request,
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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, UserQueryDto } from './dto/users.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo usuario',
    description: 'Registra un nuevo usuario en el sistema. Solo administradores.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos los usuarios',
    description: 'Obtiene lista paginada de usuarios con filtros opcionales',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida' })
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Obtener estadísticas de usuarios',
    description: 'Estadísticas generales: total, activos, por rol, etc.',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStatistics() {
    return this.usersService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Obtiene información detallada de un usuario específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/family-members')
  @ApiOperation({
    summary: 'Obtener miembros de familia',
    description: 'Lista de familiares asociados a un adulto mayor',
  })
  @ApiResponse({ status: 200, description: 'Lista de familiares' })
  async getFamilyMembers(@Param('id') id: string) {
    return this.usersService.getFamilyMembers(id);
  }

  @Get(':id/caregivers')
  @ApiOperation({
    summary: 'Obtener cuidadores',
    description: 'Lista de cuidadores asignados a un adulto mayor',
  })
  @ApiResponse({ status: 200, description: 'Lista de cuidadores' })
  async getCaregivers(@Param('id') id: string) {
    return this.usersService.getCaregivers(id);
  }

  @Get(':id/healthcare-providers')
  @ApiOperation({
    summary: 'Obtener proveedores de salud',
    description: 'Lista de médicos y proveedores de salud asignados',
  })
  @ApiResponse({ status: 200, description: 'Lista de proveedores' })
  async getHealthcareProviders(@Param('id') id: string) {
    return this.usersService.getHealthcareProviders(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza información de un usuario existente',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Put(':id/change-password')
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description: 'Permite al usuario cambiar su contraseña',
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(id, changePasswordDto);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  @Put(':id/verify-email')
  @ApiOperation({
    summary: 'Verificar email',
    description: 'Marca el email del usuario como verificado',
  })
  @ApiResponse({ status: 200, description: 'Email verificado' })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Param('id') id: string) {
    await this.usersService.verifyEmail(id);
    return { message: 'Email verificado exitosamente' };
  }

  @Put(':id/deactivate')
  @ApiOperation({
    summary: 'Desactivar usuario',
    description: 'Desactiva un usuario sin eliminarlo (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    await this.usersService.deactivate(id);
    return { message: 'Usuario desactivado exitosamente' };
  }

  @Put(':id/activate')
  @ApiOperation({
    summary: 'Activar usuario',
    description: 'Reactiva un usuario previamente desactivado',
  })
  @ApiResponse({ status: 200, description: 'Usuario activado' })
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    await this.usersService.activate(id);
    return { message: 'Usuario activado exitosamente' };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar usuario permanentemente',
    description: 'Elimina un usuario de forma permanente. Solo administradores.',
  })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'Usuario eliminado exitosamente' };
  }
}
