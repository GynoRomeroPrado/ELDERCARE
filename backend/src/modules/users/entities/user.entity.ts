import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Device } from '../../devices/entities/device.entity';
import { Family } from '../../family/entities/family.entity';

export enum UserRole {
  ELDER = 'elder',
  FAMILY = 'family',
  CAREGIVER = 'caregiver',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ELDER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  profilePhoto: string;

  @Column({ type: 'jsonb', nullable: true })
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  emergencyContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  medicalInfo: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    primaryPhysician?: string;
    insuranceProvider?: string;
    insuranceNumber?: string;
  };

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  mfaSecret: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'America/New_York' })
  timezone: string;

  @Column({ type: 'jsonb', default: {} })
  preferences: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    accessibility?: {
      fontSize?: string;
      highContrast?: boolean;
      voiceAssistance?: boolean;
    };
  };

  @OneToMany(() => Device, (device) => device.owner)
  devices: Device[];

  @ManyToMany(() => Family, (family) => family.members)
  families: Family[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
