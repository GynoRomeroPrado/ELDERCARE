import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DeviceType {
  PILL_DISPENSER = 'pill_dispenser',
  FALL_SENSOR = 'fall_sensor',
  ENVIRONMENTAL_SENSOR = 'environmental_sensor',
  EMERGENCY_BUTTON = 'emergency_button',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  deviceId: string; // e.g., PILL_DISPENSER_001

  @Column({
    type: 'enum',
    enum: DeviceType,
  })
  type: DeviceType;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.OFFLINE,
  })
  status: DeviceStatus;

  @Column()
  firmwareVersion: string;

  @Column({ nullable: true })
  hardwareVersion: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  installedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  location: {
    room?: string;
    floor?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  configuration: any;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastDataReceived: Date;

  @Column({ type: 'jsonb', nullable: true })
  healthMetrics: {
    batteryLevel?: number;
    signalStrength?: number;
    temperature?: number;
    uptime?: number;
    errorCount?: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.devices, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
