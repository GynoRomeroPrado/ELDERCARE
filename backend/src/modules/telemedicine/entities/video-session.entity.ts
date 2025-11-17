/**
 * Video Session Entity
 * Telemedicine video consultation sessions
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum SessionType {
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP',
  FALL_FOLLOWUP = 'FALL_FOLLOWUP',
  MEDICATION_REVIEW = 'MEDICATION_REVIEW',
  EMERGENCY_CONSULTATION = 'EMERGENCY_CONSULTATION',
  FAMILY_CONFERENCE = 'FAMILY_CONFERENCE',
}

@Entity('video_sessions')
export class VideoSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_sid', nullable: true })
  roomSid: string;

  @Column({ name: 'room_name' })
  roomName: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'elder_id' })
  elder: User;

  @Column({ name: 'elder_id' })
  elderId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({
    type: 'enum',
    enum: SessionType,
    default: SessionType.ROUTINE_CHECKUP,
  })
  type: SessionType;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'chief_complaint', type: 'text', nullable: true })
  chiefComplaint: string;

  @Column({ type: 'jsonb', nullable: true })
  diagnosis: any;

  @Column({ name: 'prescription_issued', type: 'boolean', default: false })
  prescriptionIssued: boolean;

  @Column({ type: 'jsonb', nullable: true })
  prescriptions: any;

  @Column({ name: 'follow_up_required', type: 'boolean', default: false })
  followUpRequired: boolean;

  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate: Date;

  @Column({ name: 'recording_enabled', type: 'boolean', default: false })
  recordingEnabled: boolean;

  @Column({ name: 'recording_sid', nullable: true })
  recordingSid: string;

  @Column({ name: 'recording_url', nullable: true })
  recordingUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  participants: any;

  @Column({ name: 'quality_rating', type: 'integer', nullable: true })
  qualityRating: number;

  @Column({ name: 'elder_feedback', type: 'text', nullable: true })
  elderFeedback: string;

  @Column({ name: 'provider_feedback', type: 'text', nullable: true })
  providerFeedback: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
