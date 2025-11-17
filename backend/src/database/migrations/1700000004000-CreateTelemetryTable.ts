/**
 * Create Device Telemetry Table Migration
 * Time-series data from IoT devices
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTelemetryTable1700000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'device_telemetry',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'device_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'battery_level',
            type: 'integer',
            isNullable: true,
            comment: 'Battery percentage 0-100',
          },
          {
            name: 'signal_strength',
            type: 'integer',
            isNullable: true,
            comment: 'WiFi/LTE signal strength in dBm',
          },
          {
            name: 'temperature',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            comment: 'Temperature in Celsius',
          },
          {
            name: 'humidity',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            comment: 'Relative humidity percentage',
          },
          {
            name: 'uptime_seconds',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'free_memory_bytes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'cpu_usage_percent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'error_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'metrics',
            type: 'jsonb',
            isNullable: true,
            comment: 'Device-specific metrics',
          },
        ],
      }),
      true,
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'device_telemetry',
      new TableForeignKey({
        columnNames: ['device_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'devices',
        onDelete: 'CASCADE',
      }),
    );

    // Create index on device_id
    await queryRunner.createIndex(
      'device_telemetry',
      new TableIndex({
        name: 'IDX_device_telemetry_device_id',
        columnNames: ['device_id'],
      }),
    );

    // Convert to TimescaleDB hypertable for time-series optimization
    await queryRunner.query(`
      SELECT create_hypertable('device_telemetry', 'timestamp',
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      );
    `);

    // Create continuous aggregate for hourly rollups
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW device_telemetry_hourly
      WITH (timescaledb.continuous) AS
      SELECT
        device_id,
        time_bucket('1 hour', timestamp) AS bucket,
        AVG(battery_level) AS avg_battery_level,
        MIN(battery_level) AS min_battery_level,
        AVG(signal_strength) AS avg_signal_strength,
        AVG(temperature) AS avg_temperature,
        AVG(humidity) AS avg_humidity,
        COUNT(*) AS data_points
      FROM device_telemetry
      GROUP BY device_id, bucket
      WITH NO DATA;
    `);

    // Add refresh policy for continuous aggregate
    await queryRunner.query(`
      SELECT add_continuous_aggregate_policy('device_telemetry_hourly',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour',
        if_not_exists => TRUE
      );
    `);

    // Create retention policy (keep raw data for 90 days, hourly aggregates for 2 years)
    await queryRunner.query(`
      SELECT add_retention_policy('device_telemetry', INTERVAL '90 days', if_not_exists => TRUE);
    `);

    await queryRunner.query(`
      SELECT add_retention_policy('device_telemetry_hourly', INTERVAL '2 years', if_not_exists => TRUE);
    `);

    // Create index on timestamp for faster queries
    await queryRunner.createIndex(
      'device_telemetry',
      new TableIndex({
        name: 'IDX_device_telemetry_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    // Composite index for common queries
    await queryRunner.createIndex(
      'device_telemetry',
      new TableIndex({
        name: 'IDX_device_telemetry_device_timestamp',
        columnNames: ['device_id', 'timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP MATERIALIZED VIEW IF EXISTS device_telemetry_hourly CASCADE');
    await queryRunner.dropTable('device_telemetry');
  }
}
