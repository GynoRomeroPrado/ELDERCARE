-- PostgreSQL initialization script for ELDERCARE+ database
-- Creates necessary extensions for TimescaleDB and advanced features

-- Enable TimescaleDB extension for time-series data
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable advanced text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable PostGIS for geospatial queries (location tracking)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create TimescaleDB hypertables for telemetry data
-- Note: This will be done via TypeORM migrations, but can be done here for initial setup

-- Create a function for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE eldercare TO eldercare;

-- Set timezone to UTC
SET timezone = 'UTC';

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'ELDERCARE+ database initialized successfully';
  RAISE NOTICE 'TimescaleDB version: %', extversion FROM pg_extension WHERE extname = 'timescaledb';
END $$;
