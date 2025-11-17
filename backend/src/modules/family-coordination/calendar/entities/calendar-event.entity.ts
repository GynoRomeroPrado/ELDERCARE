/**
 * Entidad de Evento de Calendario
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';

export enum EventType {
  MEDICAL_APPOINTMENT = 'MEDICAL_APPOINTMENT',
  MEDICATION_SCHEDULE = 'MEDICATION_SCHEDULE',
  FAMILY_VISIT = 'FAMILY_VISIT',
  ACTIVITY = 'ACTIVITY',
  REMINDER = 'REMINDER',
  CUSTOM = 'CUSTOM',
}

export enum EventPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RecurrenceType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.CUSTOM,
  })
  eventType: EventType;

  @Column({
    type: 'enum',
    enum: EventPriority,
    default: EventPriority.MEDIUM,
  })
  priority: EventPriority;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ default: false })
  allDay: boolean;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  recurrence: RecurrenceType;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  recurrenceRule: any;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'calendar_event_participants',
    joinColumn: { name: 'eventId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  participants: User[];

  @Column({ type: 'int', nullable: true })
  reminderMinutes: number;

  @Column({ default: false })
  reminderSent: boolean;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isCancelled: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
