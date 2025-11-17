/**
 * TypeORM Configuration
 * Database connection and migration settings
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'eldercare',
  password: process.env.DB_PASSWORD || 'eldercare_dev_password',
  database: process.env.DB_DATABASE || 'eldercare',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

  // Entities
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],

  // Migrations
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false, // Don't auto-run migrations on startup

  // Synchronization (NEVER use in production!)
  synchronize: process.env.DB_SYNCHRONIZE === 'true',

  // Logging
  logging: process.env.DB_LOGGING === 'true',
  logger: 'advanced-console',

  // Connection pool
  extra: {
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  },

  // Naming strategy (snake_case for database columns)
  namingStrategy: {
    tableName(targetName: string, userSpecifiedName: string | undefined): string {
      return userSpecifiedName || targetName;
    },
    columnName(propertyName: string, customName: string | undefined): string {
      return customName || propertyName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    },
  },
};

// Create DataSource for migrations
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
