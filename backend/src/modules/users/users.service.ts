/**
 * Servicio de Usuarios
 * Lógica de negocio para gestión de usuarios
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, UserQueryDto, UserRole } from './dto/users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Crear nuevo usuario
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Crear usuario
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  /**
   * Obtener todos los usuarios con filtros
   */
  async findAll(query: UserQueryDto): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, role, search, isActive } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.phoneNumber',
        'user.avatarUrl',
        'user.isActive',
        'user.emailVerified',
        'user.createdAt',
      ])
      .skip(skip)
      .take(limit);

    // Filtros
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener usuario por ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'phoneNumber',
        'dateOfBirth',
        'medicalInfo',
        'emergencyContacts',
        'address',
        'avatarUrl',
        'timezone',
        'language',
        'mfaEnabled',
        'emailVerified',
        'phoneVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Obtener usuario por email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Actualizar usuario
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }

    // Hash nueva contraseña
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Actualizar contraseña
    await this.userRepository.update(id, { password: hashedPassword });
  }

  /**
   * Desactivar usuario (soft delete)
   */
  async deactivate(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.update(id, { isActive: false });
  }

  /**
   * Activar usuario
   */
  async activate(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.update(id, { isActive: true });
  }

  /**
   * Eliminar usuario permanentemente
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.delete(id);
  }

  /**
   * Verificar email
   */
  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  /**
   * Obtener miembros de familia de un adulto mayor
   */
  async getFamilyMembers(elderId: string): Promise<User[]> {
    // En producción, esto requeriría una tabla de relaciones familia-adulto mayor
    // Por ahora, retornamos usuarios con rol FAMILY_MEMBER
    return this.userRepository.find({
      where: { role: UserRole.FAMILY_MEMBER, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName', 'phoneNumber', 'avatarUrl'],
    });
  }

  /**
   * Obtener cuidadores asignados a un adulto mayor
   */
  async getCaregivers(elderId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.CAREGIVER, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName', 'phoneNumber', 'avatarUrl'],
    });
  }

  /**
   * Obtener proveedores de salud de un adulto mayor
   */
  async getHealthcareProviders(elderId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.HEALTHCARE_PROVIDER, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName', 'phoneNumber', 'avatarUrl'],
    });
  }

  /**
   * Estadísticas de usuarios
   */
  async getStatistics(): Promise<any> {
    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { isActive: true } });

    const byRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const verified = await this.userRepository.count({ where: { emailVerified: true } });
    const withMFA = await this.userRepository.count({ where: { mfaEnabled: true } });

    return {
      total,
      active,
      inactive: total - active,
      byRole: byRole.reduce((acc, curr) => {
        acc[curr.role] = parseInt(curr.count);
        return acc;
      }, {}),
      emailVerified: verified,
      mfaEnabled: withMFA,
    };
  }
}
