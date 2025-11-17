/**
 * Create Fall Events Table Migration
 * Fall detection events with severity and sensor data
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateFallEventsTable1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'fall_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'device_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Elder who experienced the fall',
          },
          {
            name: 'detected_at',
            type: 'timestamp',
            isNullable: false,
            comment: 'When the fall was detected',
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            isNullable: false,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
            comment: 'ML model confidence score 0.0-1.0',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'ACKNOWLEDGED', 'FALSE_ALARM', 'EMERGENCY', 'RESOLVED'],
            default: "'PENDING'",
          },
          {
            name: 'false_alarm',
            type: 'boolean',
            default: false,
          },
          {
            name: 'false_alarm_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Location within home',
          },
          {
            name: 'time_on_ground',
            type: 'integer',
            isNullable: true,
            comment: 'Seconds person remained on ground',
          },
          {
            name: 'impact_force',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: 'Estimated impact force in Newtons',
          },
          {
            name: 'sensor_data',
            type: 'jsonb',
            isNullable: true,
            comment: 'Raw sensor data from radar, accelerometer, etc.',
          },
          {
            name: 'acknowledged_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'acknowledged_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'acknowledgment_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'emergency_services_called',
            type: 'boolean',
            default: false,
          },
          {
            name: 'emergency_called_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'emergency_call_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '911 call ID or reference',
          },
          {
            name: 'responders_dispatched',
            type: 'boolean',
            default: false,
          },
          {
            name: 'response_time_seconds',
            type: 'integer',
            isNullable: true,
            comment: 'Time from detection to acknowledgment',
          },
          {
            name: 'medical_transport',
            type: 'boolean',
            default: false,
            comment: 'Was person transported to hospital',
          },
          {
            name: 'hospital_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'injury_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'outcome',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolved_at',
            type: 'timestamp',
            isNullable: true,
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

    // Create foreign keys
    await queryRunner.createForeignKey(
      'fall_events',
      new TableForeignKey({
        columnNames: ['device_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'fall_events',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'fall_events',
      new TableForeignKey({
        columnNames: ['acknowledged_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes for efficient queries
    await queryRunner.createIndex(
      'fall_events',
      new TableIndex({
        name: 'IDX_fall_events_device_id',
        columnNames: ['device_id'],
      }),
    );

    await queryRunner.createIndex(
      'fall_events',
      new TableIndex({
        name: 'IDX_fall_events_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'fall_events',
      new TableIndex({
        name: 'IDX_fall_events_detected_at',
        columnNames: ['detected_at'],
      }),
    );

    await queryRunner.createIndex(
      'fall_events',
      new TableIndex({
        name: 'IDX_fall_events_severity',
        columnNames: ['severity'],
      }),
    );

    await queryRunner.createIndex(
      'fall_events',
      new TableIndex({
        name: 'IDX_fall_events_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'fall_events',
      new TableIndex({
        name: 'IDX_fall_events_false_alarm',
        columnNames: ['false_alarm'],
      }),
    );

    // Composite index for common queries
    await queryRunner.createIndex(
      'fall_events',
      new TableIndex({
        name: 'IDX_fall_events_user_detected_at',
        columnNames: ['user_id', 'detected_at'],
      }),
    );

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_fall_events
      BEFORE UPDATE ON fall_events
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `);

    // Convert to TimescaleDB hypertable for time-series optimization
    await queryRunner.query(`
      SELECT create_hypertable('fall_events', 'detected_at',
        chunk_time_interval => INTERVAL '7 days',
        if_not_exists => TRUE
      );
    `);

    // Create retention policy (keep data for 7 years for HIPAA compliance)
    await queryRunner.query(`
      SELECT add_retention_policy('fall_events', INTERVAL '7 years', if_not_exists => TRUE);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS set_timestamp_fall_events ON fall_events');
    await queryRunner.dropTable('fall_events');
  }
}
