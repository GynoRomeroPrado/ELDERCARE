/**
 * Create Devices Table Migration
 * IoT devices (pill dispensers, fall sensors, etc.)
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDevicesTable1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'devices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'owner_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'device_type',
            type: 'enum',
            enum: ['PILL_DISPENSER', 'FALL_SENSOR', 'ENVIRONMENTAL_SENSOR', 'EMERGENCY_BUTTON'],
            isNullable: false,
          },
          {
            name: 'serial_number',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PROVISIONING', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'],
            default: "'PROVISIONING'",
          },
          {
            name: 'firmware_version',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'hardware_version',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Human-readable location (e.g., "Kitchen Counter")',
          },
          {
            name: 'coordinates',
            type: 'jsonb',
            isNullable: true,
            comment: 'Latitude, longitude for location tracking',
          },
          {
            name: 'wifi_ssid',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'wifi_signal_strength',
            type: 'integer',
            isNullable: true,
            comment: 'RSSI in dBm',
          },
          {
            name: 'battery_level',
            type: 'integer',
            isNullable: true,
            comment: 'Battery percentage 0-100',
          },
          {
            name: 'last_heartbeat',
            type: 'timestamp',
            isNullable: true,
            comment: 'Last communication timestamp',
          },
          {
            name: 'health_status',
            type: 'enum',
            enum: ['HEALTHY', 'WARNING', 'CRITICAL', 'OFFLINE'],
            default: "'OFFLINE'",
          },
          {
            name: 'health_metrics',
            type: 'jsonb',
            isNullable: true,
            comment: 'Device-specific health metrics',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Device-specific configuration and data',
          },
          {
            name: 'iot_thing_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'AWS IoT Core Thing name',
          },
          {
            name: 'certificate_arn',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'AWS IoT certificate ARN',
          },
          {
            name: 'provisioned_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'activated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'decommissioned_at',
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

    // Create foreign key to users
    await queryRunner.createForeignKey(
      'devices',
      new TableForeignKey({
        columnNames: ['owner_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_owner_id',
        columnNames: ['owner_id'],
      }),
    );

    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_serial_number',
        columnNames: ['serial_number'],
      }),
    );

    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_device_type',
        columnNames: ['device_type'],
      }),
    );

    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_last_heartbeat',
        columnNames: ['last_heartbeat'],
      }),
    );

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_devices
      BEFORE UPDATE ON devices
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS set_timestamp_devices ON devices');
    await queryRunner.dropTable('devices');
  }
}
