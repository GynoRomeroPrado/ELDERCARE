/**
 * DTOs para Usuarios
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsEnum, IsOptional, IsDateString, IsObject, IsPhoneNumber, MinLength, Matches } from 'class-validator';

export enum UserRole {
  ELDER = 'ELDER',
  FAMILY_MEMBER = 'FAMILY_MEMBER',
  CAREGIVER = 'CAREGIVER',
  HEALTHCARE_PROVIDER = 'HEALTHCARE_PROVIDER',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
  @ApiProperty({ example: 'maria.gonzalez@eldercare.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password debe contener mayúscula, minúscula, número y carácter especial',
  })
  password: string;

  @ApiProperty({ example: 'María' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ELDER })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: '+1-555-0101' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1945-03-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: {
      allergies: ['Penicilina'],
      medications: ['Aspirina'],
      conditions: ['Diabetes'],
    },
  })
  @IsOptional()
  @IsObject()
  medicalInfo?: any;

  @ApiPropertyOptional({
    example: [
      {
        name: 'Ana González',
        relationship: 'Hija',
        phone: '+1-555-0102',
        email: 'ana@example.com',
      },
    ],
  })
  @IsOptional()
  emergencyContacts?: any[];

  @ApiPropertyOptional({
    example: {
      street: '123 Calle Principal',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
    },
  })
  @IsOptional()
  @IsObject()
  address?: any;

  @ApiPropertyOptional({ example: 'America/Los_Angeles' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'María' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'González' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1-555-0101' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  medicalInfo?: any;

  @ApiPropertyOptional()
  @IsOptional()
  emergencyContacts?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  address?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password debe contener mayúscula, minúscula, número y carácter especial',
  })
  newPassword: string;
}

export class UserQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'maria' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  isActive?: boolean;
}
