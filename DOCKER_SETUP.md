# ELDERCARE+ Docker Setup Guide

This guide explains how to run the ELDERCARE+ platform locally using Docker and Docker Compose.

## Prerequisites

- Docker Desktop 20.10+ or Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM available for Docker
- 20GB+ free disk space

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to project directory
cd ELDERCARE

# Create environment file
cp backend/.env.example backend/.env

# Update the .env file with your configuration (optional for local dev)
```

### 2. Start All Services

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
```

### 3. Verify Services

Once all services are running, verify they're accessible:

| Service | URL | Purpose |
|---------|-----|---------|
| **Backend API** | http://localhost:3000 | REST API endpoints |
| **API Documentation** | http://localhost:3000/api/docs | Swagger UI |
| **PostgreSQL** | localhost:5432 | Database (user: eldercare, password: eldercare_dev_password) |
| **Redis** | localhost:6379 | Cache (password: eldercare_redis_password) |
| **pgAdmin** | http://localhost:5050 | PostgreSQL management (admin@eldercare.local / admin) |
| **MailHog** | http://localhost:8025 | Email testing UI |
| **LocalStack** | http://localhost:4566 | AWS services emulation |

### 4. Health Check

```bash
# Check API health
curl http://localhost:3000/health

# Check database connection
docker-compose exec postgres psql -U eldercare -d eldercare -c "SELECT version();"

# Check Redis connection
docker-compose exec redis redis-cli -a eldercare_redis_password ping
```

## Development Workflow

### Hot Reload

The backend service is configured with hot reload for development:

```bash
# Edit files in backend/src/ and they'll automatically reload
# Logs will show: "File change detected. Starting incremental compilation..."
```

### Run Database Migrations

```bash
# Generate a new migration
docker-compose exec backend npm run migration:generate -- -n MigrationName

# Run pending migrations
docker-compose exec backend npm run migration:run

# Revert last migration
docker-compose exec backend npm run migration:revert
```

### Seed Database

```bash
# Run database seeder
docker-compose exec backend npm run seed
```

### Run Tests

```bash
# Run unit tests
docker-compose exec backend npm run test

# Run e2e tests
docker-compose exec backend npm run test:e2e

# Run tests with coverage
docker-compose exec backend npm run test:cov
```

### Access Database with psql

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U eldercare -d eldercare

# Useful commands:
# \dt              - List tables
# \d+ table_name   - Describe table
# \l               - List databases
# \q               - Quit
```

### Access Redis CLI

```bash
# Connect to Redis
docker-compose exec redis redis-cli -a eldercare_redis_password

# Useful commands:
# KEYS *           - List all keys
# GET key          - Get value
# FLUSHALL         - Clear all data
# EXIT             - Quit
```

## Service Management

### Stop Services

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop backend
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Remove Services

```bash
# Stop and remove containers (keeps volumes)
docker-compose down

# Remove containers and volumes (CAUTION: deletes all data)
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

### View Service Status

```bash
# List running containers
docker-compose ps

# View resource usage
docker stats
```

## Production Build

### Build Production Image

```bash
# Build production Docker image
cd backend
docker build -t eldercare-backend:latest .

# Test production image locally
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  eldercare-backend:latest
```

### Multi-Architecture Build

```bash
# Build for multiple platforms (ARM64 + AMD64)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t eldercare-backend:latest \
  -f backend/Dockerfile \
  backend/
```

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
docker-compose logs backend

# Check if port is already in use
lsof -i :3000
netstat -an | grep 3000

# Remove old containers
docker-compose down
docker-compose up -d
```

### Database Connection Issues

```bash
# Verify PostgreSQL is healthy
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection manually
docker-compose exec postgres psql -U eldercare -d eldercare -c "SELECT 1;"

# Recreate database
docker-compose down -v
docker-compose up -d postgres
# Wait 30 seconds for initialization
docker-compose up -d backend
```

### Redis Connection Issues

```bash
# Verify Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli -a eldercare_redis_password ping

# Clear Redis cache
docker-compose exec redis redis-cli -a eldercare_redis_password FLUSHALL
```

### Out of Memory

```bash
# Check Docker resource limits
docker system df

# Clean up unused resources
docker system prune -a

# Increase Docker Desktop memory limit (Mac/Windows)
# Docker Desktop → Settings → Resources → Memory → 8GB
```

### Port Conflicts

If ports are already in use, edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "3001:3000"  # Change 3001 to any available port
```

## LocalStack (AWS Emulation)

LocalStack emulates AWS services for local development:

### Create S3 Bucket

```bash
# Create S3 bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://eldercare-telemetry-data

# List buckets
aws --endpoint-url=http://localhost:4566 s3 ls
```

### Create SQS Queue

```bash
# Create SQS queue
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name eldercare-alerts-queue

# List queues
aws --endpoint-url=http://localhost:4566 sqs list-queues
```

### IoT Core

```bash
# Create IoT thing
aws --endpoint-url=http://localhost:4566 iot create-thing \
  --thing-name test-pill-dispenser

# List things
aws --endpoint-url=http://localhost:4566 iot list-things
```

## Performance Optimization

### Volume Performance (macOS)

For better performance on macOS, use delegated volumes:

```yaml
volumes:
  - ./backend/src:/app/src:delegated
```

### Build Cache

Use BuildKit for faster builds:

```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

## CI/CD Integration

The GitHub Actions workflow uses this Dockerfile for deployment:

```yaml
# .github/workflows/backend-deploy.yml
- name: Build Docker image
  run: docker build -t eldercare-backend:${{ github.sha }} backend/
```

## Security Best Practices

1. **Never commit .env files** - Use `.env.example` as template
2. **Use secrets management** - In production, use AWS Secrets Manager
3. **Scan images** - Run `docker scan eldercare-backend:latest`
4. **Update base images** - Regularly update `node:18-alpine`
5. **Use non-root user** - Dockerfile already configured with user `nestjs`

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [LocalStack Documentation](https://docs.localstack.cloud/)

## Support

For issues related to Docker setup:

1. Check logs: `docker-compose logs -f`
2. Verify resource limits: `docker system df`
3. Review environment variables: `docker-compose config`
4. Open GitHub issue with logs and system info
