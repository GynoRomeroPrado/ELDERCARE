/**
 * Entidad de Configuración de Alertas
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AlertType, AlertPriority, AlertChannel } from '../dto/alerts.dto';

@Entity('alert_configs')
export class AlertConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  alertType: AlertType;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AlertPriority,
    default: AlertPriority.MEDIUM,
  })
  priority: AlertPriority;

  @Column({
    type: 'simple-array',
  })
  channels: AlertChannel[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  conditions: any;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  triggerCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
