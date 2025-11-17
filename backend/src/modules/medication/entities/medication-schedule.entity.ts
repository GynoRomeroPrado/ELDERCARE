import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Device } from '../../devices/entities/device.entity';

export enum MedicationFrequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  AS_NEEDED = 'as_needed',
  CUSTOM = 'custom',
}

@Entity('medication_schedules')
export class MedicationSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column({ nullable: true })
  deviceId: string;

  @Column()
  medicationName: string;

  @Column({ nullable: true })
  dosage: string;

  @Column({ nullable: true })
  form: string; // pill, liquid, injection, etc.

  @Column({
    type: 'enum',
    enum: MedicationFrequency,
  })
  frequency: MedicationFrequency;

  @Column({ type: 'time', array: true })
  scheduledTimes: string[]; // ['08:00', '12:00', '18:00']

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  compartmentNumber: number; // For pill dispenser (1-28)

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ type: 'text', nullable: true })
  sideEffects: string;

  @Column({ type: 'text', nullable: true })
  prescribedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  refillInfo: {
    pharmacy?: string;
    pharmacyPhone?: string;
    prescriptionNumber?: string;
    refillsRemaining?: number;
    nextRefillDate?: Date;
  };

  @OneToMany(() => MedicationLog, (log) => log.schedule)
  logs: MedicationLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('medication_logs')
export class MedicationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MedicationSchedule, (schedule) => schedule.logs)
  @JoinColumn({ name: 'scheduleId' })
  schedule: MedicationSchedule;

  @Column()
  scheduleId: string;

  @Column({ type: 'timestamp' })
  scheduledTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualTime: Date;

  @Column({ default: false })
  taken: boolean;

  @Column({ default: false })
  missed: boolean;

  @Column({ type: 'integer', nullable: true })
  delayMinutes: number;

  @Column({ default: false })
  manualEntry: boolean; // True if logged manually, not by device

  @Column({ type: 'uuid', nullable: true })
  loggedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
