/**
 * Create Medication Tables Migration
 * Medication schedules and logs for adherence tracking
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMedicationTables1700000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create medication_schedules table
    await queryRunner.createTable(
      new Table({
        name: 'medication_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Elder taking the medication',
          },
          {
            name: 'device_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Pill dispenser device',
          },
          {
            name: 'medication_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'generic_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'dosage',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'e.g., "10mg", "2 tablets"',
          },
          {
            name: 'dosage_form',
            type: 'enum',
            enum: ['TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'TOPICAL', 'OTHER'],
            isNullable: true,
          },
          {
            name: 'frequency',
            type: 'enum',
            enum: ['ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'AS_NEEDED', 'CUSTOM'],
            isNullable: false,
          },
          {
            name: 'times_of_day',
            type: 'jsonb',
            isNullable: false,
            comment: 'Array of time strings ["08:00", "20:00"]',
          },
          {
            name: 'days_of_week',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of numbers [0-6] for Sunday-Saturday, null for all days',
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: true,
            comment: 'Special instructions (e.g., "Take with food")',
          },
          {
            name: 'prescribing_physician',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'prescribed_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true,
            comment: 'null for ongoing medications',
          },
          {
            name: 'refill_info',
            type: 'jsonb',
            isNullable: true,
            comment: 'Refill count, last refill date, pharmacy info',
          },
          {
            name: 'side_effects',
            type: 'jsonb',
            isNullable: true,
            comment: 'Known side effects and warnings',
          },
          {
            name: 'interactions',
            type: 'jsonb',
            isNullable: true,
            comment: 'Drug interactions to watch for',
          },
          {
            name: 'compartment_number',
            type: 'integer',
            isNullable: true,
            comment: 'Pill dispenser compartment (1-28)',
          },
          {
            name: 'reminder_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'reminder_advance_minutes',
            type: 'integer',
            default: 15,
            comment: 'Send reminder X minutes before scheduled time',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create medication_logs table for adherence tracking
    await queryRunner.createTable(
      new Table({
        name: 'medication_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'schedule_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'device_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'scheduled_time',
            type: 'timestamp',
            isNullable: false,
            comment: 'When medication should have been taken',
          },
          {
            name: 'taken_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Actual time taken, null if skipped',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'TAKEN', 'MISSED', 'SKIPPED', 'LATE'],
            default: "'PENDING'",
          },
          {
            name: 'taken_method',
            type: 'enum',
            enum: ['AUTO_DISPENSER', 'MANUAL_CONFIRMATION', 'SENSOR_DETECTION', 'FAMILY_CONFIRMATION'],
            isNullable: true,
          },
          {
            name: 'delay_minutes',
            type: 'integer',
            isNullable: true,
            comment: 'How many minutes late (positive) or early (negative)',
          },
          {
            name: 'missed_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'side_effects_reported',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confirmed_by_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Family member or caregiver who confirmed',
          },
          {
            name: 'reminder_sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reminder_acknowledged',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys for medication_schedules
    await queryRunner.createForeignKey(
      'medication_schedules',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_schedules',
      new TableForeignKey({
        columnNames: ['device_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign keys for medication_logs
    await queryRunner.createForeignKey(
      'medication_logs',
      new TableForeignKey({
        columnNames: ['schedule_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'medication_schedules',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_logs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_logs',
      new TableForeignKey({
        columnNames: ['device_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_logs',
      new TableForeignKey({
        columnNames: ['confirmed_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes for medication_schedules
    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_device_id',
        columnNames: ['device_id'],
      }),
    );

    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_is_active',
        columnNames: ['is_active'],
      }),
    );

    // Create indexes for medication_logs
    await queryRunner.createIndex(
      'medication_logs',
      new TableIndex({
        name: 'IDX_medication_logs_schedule_id',
        columnNames: ['schedule_id'],
      }),
    );

    await queryRunner.createIndex(
      'medication_logs',
      new TableIndex({
        name: 'IDX_medication_logs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'medication_logs',
      new TableIndex({
        name: 'IDX_medication_logs_scheduled_time',
        columnNames: ['scheduled_time'],
      }),
    );

    await queryRunner.createIndex(
      'medication_logs',
      new TableIndex({
        name: 'IDX_medication_logs_status',
        columnNames: ['status'],
      }),
    );

    // Composite index for adherence queries
    await queryRunner.createIndex(
      'medication_logs',
      new TableIndex({
        name: 'IDX_medication_logs_user_scheduled_time',
        columnNames: ['user_id', 'scheduled_time'],
      }),
    );

    // Create triggers
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_medication_schedules
      BEFORE UPDATE ON medication_schedules
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `);

    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_medication_logs
      BEFORE UPDATE ON medication_logs
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `);

    // Convert medication_logs to TimescaleDB hypertable
    await queryRunner.query(`
      SELECT create_hypertable('medication_logs', 'scheduled_time',
        chunk_time_interval => INTERVAL '30 days',
        if_not_exists => TRUE
      );
    `);

    // Create retention policy (7 years for HIPAA)
    await queryRunner.query(`
      SELECT add_retention_policy('medication_logs', INTERVAL '7 years', if_not_exists => TRUE);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS set_timestamp_medication_schedules ON medication_schedules');
    await queryRunner.query('DROP TRIGGER IF EXISTS set_timestamp_medication_logs ON medication_logs');
    await queryRunner.dropTable('medication_logs');
    await queryRunner.dropTable('medication_schedules');
  }
}
