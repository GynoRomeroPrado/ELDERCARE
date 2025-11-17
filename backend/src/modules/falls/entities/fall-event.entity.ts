import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Device } from '../../devices/entities/device.entity';

export enum FallSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum FallStatus {
  DETECTED = 'detected',
  ACKNOWLEDGED = 'acknowledged',
  FALSE_ALARM = 'false_alarm',
  RESPONDED = 'responded',
  ESCALATED = 'escalated',
}

@Entity('fall_events')
export class FallEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column()
  deviceId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'timestamp' })
  detectedAt: Date;

  @Column({
    type: 'enum',
    enum: FallSeverity,
  })
  severity: FallSeverity;

  @Column({ type: 'float' })
  confidence: number; // 0.0 - 1.0

  @Column({
    type: 'enum',
    enum: FallStatus,
    default: FallStatus.DETECTED,
  })
  status: FallStatus;

  @Column({ type: 'jsonb', nullable: true })
  location: {
    room?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @Column({ type: 'integer', nullable: true })
  timeOnGround: number; // seconds

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  respondedBy: string;

  @Column({ type: 'integer', nullable: true })
  responseTime: number; // seconds from detection to acknowledgment

  @Column({ default: false })
  emergencyServicesCalled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emergencyCalledAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  sensorData: {
    accelerometer?: any;
    gyroscope?: any;
    radarPointCloud?: any;
    audioPattern?: any;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  outcome: {
    injury?: boolean;
    injuryType?: string;
    hospitalVisit?: boolean;
    followUpRequired?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;
}
