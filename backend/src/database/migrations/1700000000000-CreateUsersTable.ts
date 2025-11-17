/**
 * Create Users Table Migration
 * Users, authentication, and profile information
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['ELDER', 'FAMILY_MEMBER', 'CAREGIVER', 'HEALTHCARE_PROVIDER', 'ADMIN'],
            isNullable: false,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'date_of_birth',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'medical_info',
            type: 'jsonb',
            isNullable: true,
            comment: 'Allergies, medications, conditions',
          },
          {
            name: 'emergency_contacts',
            type: 'jsonb',
            isNullable: true,
            comment: 'Emergency contact information',
          },
          {
            name: 'address',
            type: 'jsonb',
            isNullable: true,
            comment: 'Street, city, state, zip, coordinates',
          },
          {
            name: 'avatar_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            default: "'UTC'",
          },
          {
            name: 'language',
            type: 'varchar',
            length: '10',
            default: "'en'",
          },
          {
            name: 'mfa_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'mfa_secret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'email_verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'phone_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'last_login_at',
            type: 'timestamp',
            isNullable: true,
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_role',
        columnNames: ['role'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_users
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS set_timestamp_users ON users');
    await queryRunner.dropTable('users');
  }
}
