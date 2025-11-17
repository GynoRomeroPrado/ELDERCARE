/**
 * Entidad de Historial de Alertas
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AlertConfig } from './alert-config.entity';
import { User } from '../../users/entities/user.entity';
import { AlertStatus } from '../dto/alerts.dto';

@Entity('alert_history')
export class AlertHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  alertConfigId: string;

  @ManyToOne(() => AlertConfig)
  @JoinColumn({ name: 'alertConfigId' })
  alertConfig: AlertConfig;

  @Column()
  message: string;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.TRIGGERED,
  })
  status: AlertStatus;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  data: any;

  @Column({ type: 'timestamp' })
  triggeredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedReason: string;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolvedBy' })
  resolver: User;

  @CreateDateColumn()
  createdAt: Date;
}
