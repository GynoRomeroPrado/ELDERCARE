# Database Migrations Guide

This guide explains how to manage database schema changes using TypeORM migrations.

## Overview

ELDERCARE+ uses TypeORM migrations to manage database schema changes in a version-controlled, repeatable manner. All migrations are stored in `src/database/migrations/`.

## Migration Files

### Current Migrations

1. **1700000000000-CreateUsersTable.ts**
   - Users, authentication, and profiles
   - Roles: ELDER, FAMILY_MEMBER, CAREGIVER, HEALTHCARE_PROVIDER, ADMIN
   - MFA support, medical info (JSONB)

2. **1700000001000-CreateDevicesTable.ts**
   - IoT devices (pill dispensers, fall sensors)
   - Device status, health metrics, AWS IoT integration
   - Foreign key to users table

3. **1700000002000-CreateFallEventsTable.ts**
   - Fall detection events with severity levels
   - Emergency response tracking
   - TimescaleDB hypertable (7-day chunks)
   - 7-year retention policy (HIPAA compliance)

4. **1700000003000-CreateMedicationTables.ts**
   - `medication_schedules`: Medication regimens
   - `medication_logs`: Adherence tracking
   - TimescaleDB hypertable for logs
   - 7-year retention policy

5. **1700000004000-CreateTelemetryTable.ts**
   - Device telemetry time-series data
   - TimescaleDB hypertable (1-day chunks)
   - Continuous aggregates (hourly rollups)
   - 90-day retention for raw data, 2 years for aggregates

## Prerequisites

### 1. TimescaleDB Extensions

Ensure PostgreSQL has TimescaleDB extension enabled:

```sql
-- Connect to database
psql -U eldercare -d eldercare

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Note**: Docker Compose automatically runs `/infrastructure/postgres/init/01-create-extensions.sql` on first startup.

### 2. Environment Configuration

Ensure `.env` has correct database credentials:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=eldercare
DB_USERNAME=eldercare
DB_PASSWORD=your_password
```

## Running Migrations

### Run All Pending Migrations

```bash
npm run migration:run
```

This executes all migrations that haven't been run yet, in order.

**Output**:
```
query: SELECT * FROM "typeorm_migrations"
query: BEGIN TRANSACTION
query: CREATE TABLE "users" ...
query: INSERT INTO "typeorm_migrations" ...
query: COMMIT
Migration CreateUsersTable1700000000000 has been executed successfully.
```

### Check Migration Status

```bash
# Show pending migrations
npm run migration:show
```

### Revert Last Migration

```bash
npm run migration:revert
```

This reverts the most recently executed migration. Run multiple times to revert further.

### Revert All Migrations

```bash
# Revert one by one
while npm run migration:revert; do :; done
```

## Creating New Migrations

### Generate Migration from Entity Changes

```bash
# TypeORM compares entities with current database schema
npm run migration:generate -- -n AddUserPreferences
```

This creates a new migration file with the necessary SQL to match your entity definitions.

### Create Empty Migration

```bash
# For custom SQL or data migrations
npm run migration:create -- -n AddIndexesForPerformance
```

Then edit the generated file:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesForPerformance1700000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add your SQL here
    await queryRunner.query(`
      CREATE INDEX idx_custom ON table_name (column_name);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_custom;
    `);
  }
}
```

## Migration Best Practices

### 1. Always Test Migrations

```bash
# Test on local database first
npm run migration:run

# Verify schema
psql -U eldercare -d eldercare -c "\d+ users"

# Test revert
npm run migration:revert

# Re-run migration
npm run migration:run
```

### 2. Make Migrations Reversible

Always implement both `up()` and `down()` methods:

```typescript
export class AddUserColumn implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'preferences',
      type: 'jsonb',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'preferences');
  }
}
```

### 3. Use Transactions

Migrations run in transactions by default. For complex migrations:

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.startTransaction();

  try {
    // Multiple operations
    await queryRunner.query(`...`);
    await queryRunner.query(`...`);

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  }
}
```

### 4. Avoid Breaking Changes

When modifying existing columns:

```typescript
// ✅ GOOD: Add new nullable column
await queryRunner.addColumn('users', new TableColumn({
  name: 'new_field',
  type: 'varchar',
  isNullable: true, // Won't break existing data
}));

// ❌ BAD: Add non-nullable column without default
await queryRunner.addColumn('users', new TableColumn({
  name: 'required_field',
  type: 'varchar',
  isNullable: false, // Will fail if table has data
}));

// ✅ GOOD: Add with default, then make non-nullable in separate migration
await queryRunner.addColumn('users', new TableColumn({
  name: 'required_field',
  type: 'varchar',
  isNullable: true,
  default: "'default_value'",
}));
```

### 5. TimescaleDB Considerations

When creating hypertables:

```typescript
// Check if already a hypertable
const isHypertable = await queryRunner.query(`
  SELECT * FROM timescaledb_information.hypertables
  WHERE hypertable_name = 'table_name'
`);

if (isHypertable.length === 0) {
  await queryRunner.query(`
    SELECT create_hypertable('table_name', 'timestamp',
      chunk_time_interval => INTERVAL '7 days',
      if_not_exists => TRUE
    );
  `);
}
```

## CI/CD Integration

Migrations run automatically in GitHub Actions:

```yaml
# .github/workflows/backend-deploy.yml
- name: Run database migrations
  run: |
    TASK_ARN=$(aws ecs run-task \
      --overrides '{"containerOverrides":[{"name":"eldercare-api","command":["npm","run","migration:run"]}]}' \
      ...)
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Test migrations on development database
- [ ] Test migrations on staging database
- [ ] Verify migration reversal works
- [ ] Check for blocking locks (long-running queries)
- [ ] Schedule maintenance window if needed
- [ ] Backup database before running migrations

### Running Migrations in Production

```bash
# 1. Backup database
pg_dump -U eldercare -d eldercare > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
npm run migration:run

# 3. Verify schema
psql -U eldercare -d eldercare -c "\d+"

# 4. Test application
curl http://localhost:3000/health
```

### Rollback Plan

If migration causes issues:

```bash
# Option 1: Revert migration
npm run migration:revert

# Option 2: Restore from backup
psql -U eldercare -d eldercare < backup_20241117_103000.sql
```

## Troubleshooting

### Migration Fails Mid-Execution

Migrations run in transactions, so failures automatically rollback:

```
Error: column "email" already exists
query failed: ALTER TABLE "users" ADD "email" ...
```

Fix the migration file and re-run.

### "Migration ... has already been executed"

Check migration history:

```bash
psql -U eldercare -d eldercare -c "SELECT * FROM typeorm_migrations ORDER BY timestamp DESC;"
```

To force re-run (DANGER):

```bash
# Delete migration record
psql -U eldercare -d eldercare -c "DELETE FROM typeorm_migrations WHERE name = 'MigrationName';"

# Re-run
npm run migration:run
```

### TimescaleDB Errors

```
ERROR: function create_hypertable does not exist
```

Solution: Install TimescaleDB extension:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

### Lock Timeout

```
ERROR: could not obtain lock on relation "users"
```

Solution: Kill blocking queries:

```sql
-- Find blocking queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Kill query
SELECT pg_terminate_backend(pid);
```

## Seeding Data

After migrations, seed initial data:

```bash
npm run seed
```

See `src/database/seeds/` for seed scripts.

## Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [TimescaleDB Hypertables](https://docs.timescale.com/use-timescale/latest/hypertables/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don't_Do_This)
