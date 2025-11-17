# ELDERCARE+ AWS Infrastructure

## Overview

This directory contains Infrastructure as Code (IaC) for deploying the ELDERCARE+ platform on AWS. The infrastructure is designed for high availability, security, and HIPAA compliance.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│                         us-east-1                                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────── VPC (10.0.0.0/16) ─────────────────────┐
│                                                                  │
│  ┌─────────── Public Subnets ───────────┐                       │
│  │  10.0.1.0/24 (AZ-1)                  │                       │
│  │  10.0.2.0/24 (AZ-2)                  │                       │
│  │  ┌─────────────────────────────┐     │                       │
│  │  │  Application Load Balancer  │     │                       │
│  │  │  (ALB)                      │     │                       │
│  │  └──────────┬──────────────────┘     │                       │
│  └─────────────┼────────────────────────┘                       │
│                │                                                 │
│  ┌─────────────▼─── Private Subnets ────────────┐              │
│  │  10.0.10.0/24 (AZ-1)                         │              │
│  │  10.0.11.0/24 (AZ-2)                         │              │
│  │  ┌────────────────────────────────────┐      │              │
│  │  │  ECS Fargate (Backend API)         │      │              │
│  │  │  - Auto Scaling (2-20 tasks)       │      │              │
│  │  │  - Health checks                   │      │              │
│  │  └────────────┬───────────────────────┘      │              │
│  └───────────────┼──────────────────────────────┘              │
│                  │                                              │
│  ┌───────────────▼─── Database Subnets ─────────┐              │
│  │  10.0.20.0/24 (AZ-1)                         │              │
│  │  10.0.21.0/24 (AZ-2)                         │              │
│  │  ┌────────────────────────────────────┐      │              │
│  │  │  RDS PostgreSQL (Multi-AZ)         │      │              │
│  │  │  - Primary: AZ-1                   │      │              │
│  │  │  - Standby: AZ-2                   │      │              │
│  │  │  - Read Replica (optional)         │      │              │
│  │  └────────────────────────────────────┘      │              │
│  │  ┌────────────────────────────────────┐      │              │
│  │  │  ElastiCache Redis (Cluster)       │      │              │
│  │  │  - 3 nodes across AZs              │      │              │
│  │  └────────────────────────────────────┘      │              │
│  └──────────────────────────────────────────────┘              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌────────────── Managed Services (Outside VPC) ──────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  AWS IoT Core                                          │    │
│  │  - MQTT broker                                         │    │
│  │  - Device registry & shadows                          │    │
│  │  - Rules engine → Lambda                              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  S3 Buckets                                            │    │
│  │  - Telemetry data (lifecycle: 90 days → Glacier)       │    │
│  │  - User uploads (photos, documents)                    │    │
│  │  - Backups (cross-region replication)                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  CloudFront CDN                                        │    │
│  │  - Global edge locations                              │    │
│  │  - HTTPS only, TLS 1.3                                │    │
│  │  - WAF (Web Application Firewall)                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Monitoring & Security                                 │    │
│  │  - CloudWatch (logs, metrics, alarms)                 │    │
│  │  - GuardDuty (threat detection)                       │    │
│  │  - Security Hub (compliance scanning)                 │    │
│  │  - AWS Config (resource tracking)                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Infrastructure Components

### Networking

**VPC:**
- CIDR: `10.0.0.0/16`
- Subnets:
  - Public (2): `10.0.1.0/24`, `10.0.2.0/24` (ALB, NAT Gateway)
  - Private (2): `10.0.10.0/24`, `10.0.11.0/24` (ECS tasks)
  - Database (2): `10.0.20.0/24`, `10.0.21.0/24` (RDS, ElastiCache)
- Multi-AZ deployment across `us-east-1a` and `us-east-1b`

**Security Groups:**
- `alb-sg`: Allows 443 from 0.0.0.0/0
- `ecs-sg`: Allows 3000 from `alb-sg`
- `rds-sg`: Allows 5432 from `ecs-sg`
- `redis-sg`: Allows 6379 from `ecs-sg`

### Compute

**ECS Fargate:**
- Service: `eldercare-api`
- Task Definition:
  - CPU: 1024 (1 vCPU)
  - Memory: 2048 MB
  - Container: Backend API (NestJS)
- Auto Scaling:
  - Min: 2 tasks
  - Max: 20 tasks
  - Target CPU: 70%
  - Target Memory: 80%

### Database

**RDS PostgreSQL:**
- Engine: PostgreSQL 15.3
- Instance: `db.r6g.xlarge` (4 vCPU, 32 GB RAM)
- Storage: 100 GB GP3 SSD (auto-scaling to 1 TB)
- Multi-AZ: Yes (automatic failover)
- Backups:
  - Automated daily backups (35-day retention)
  - Point-in-time recovery (PITR)
- Encryption: AES-256 (KMS)
- Parameter Group: Custom (TimescaleDB extension)

**TimescaleDB:**
- Extension on PostgreSQL
- Hypertables for time-series telemetry
- Continuous aggregates for analytics
- Compression policy (7 days → compress)
- Retention policy (90 days → drop)

### Caching

**ElastiCache Redis:**
- Engine: Redis 7.0
- Node: `cache.r6g.large` (2 vCPU, 13 GB RAM)
- Cluster: 3 nodes across AZs
- Replication: 1 primary + 2 replicas
- Automatic failover: Yes
- Encryption: At rest + in transit

### Storage

**S3 Buckets:**

1. **eldercare-telemetry-prod**
   - Purpose: Device telemetry data
   - Lifecycle:
     - Day 0-30: Standard
     - Day 30-90: Intelligent-Tiering
     - Day 90+: Glacier
   - Versioning: Disabled
   - Encryption: SSE-KMS

2. **eldercare-uploads-prod**
   - Purpose: User photos, documents
   - Versioning: Enabled
   - Encryption: SSE-KMS
   - Public access: Blocked (pre-signed URLs only)

3. **eldercare-backups-prod**
   - Purpose: Database backups, configs
   - Cross-region replication: us-west-2
   - Lifecycle: Retain 7 years
   - Encryption: SSE-KMS
   - MFA Delete: Enabled

### IoT

**AWS IoT Core:**
- Endpoint: `a3xxxxxxxx-ats.iot.us-east-1.amazonaws.com`
- Protocol: MQTT over TLS 1.3 (port 8883)
- Authentication: X.509 certificates (per device)
- Rules Engine:
  - Rule 1: Telemetry → Kinesis Data Streams
  - Rule 2: Alerts → Lambda → SNS
  - Rule 3: Commands → Device shadows

**Device Registry:**
- Thing Type: `pill-dispenser`, `fall-sensor`
- Attributes: `model`, `firmware_version`, `installation_date`
- Shadows: Track online/offline, last reported state

### Serverless

**Lambda Functions:**

1. **device-ingest** (Node.js 18)
   - Trigger: IoT Rule (telemetry)
   - Memory: 512 MB
   - Timeout: 30s
   - Purpose: Parse telemetry, write to TimescaleDB

2. **alert-processor** (Node.js 18)
   - Trigger: IoT Rule (alerts)
   - Memory: 256 MB
   - Timeout: 10s
   - Purpose: Send push notifications, SMS, emails

3. **fall-ml-inference** (Python 3.9)
   - Trigger: S3 (new radar data)
   - Memory: 3008 MB (max)
   - Timeout: 5 minutes
   - Purpose: Batch ML inference (if edge fails)

### CDN

**CloudFront:**
- Origin: ALB (backend API) + S3 (static assets)
- Cache behavior:
  - `/api/*`: No cache (always fetch from origin)
  - `/static/*`: Cache 7 days (images, CSS, JS)
- SSL: TLS 1.3 minimum, custom certificate (ACM)
- Geo-restriction: US only (optional, for compliance)
- WAF: Enabled (AWS Managed Rules)

### Security

**IAM Roles:**
- `ecs-task-execution-role`: Pull images, write logs
- `ecs-task-role`: Access to S3, RDS, Secrets Manager
- `lambda-execution-role`: CloudWatch Logs, VPC access
- `iot-rule-action-role`: Invoke Lambda, publish to SNS

**Secrets Manager:**
- Database credentials (auto-rotation 30 days)
- API keys (Twilio, SendGrid, Firebase)
- X.509 certificate CA

**KMS Keys:**
- `alias/eldercare-rds`: Database encryption
- `alias/eldercare-s3`: S3 bucket encryption
- `alias/eldercare-secrets`: Secrets Manager encryption
- Key rotation: Automatic (annual)

### Monitoring

**CloudWatch:**
- Log Groups:
  - `/ecs/eldercare-api`: Backend API logs (7-day retention)
  - `/aws/lambda/*`: Lambda function logs (30-day retention)
  - `/aws/rds/postgresql/*`: Database logs (90-day retention)
- Metrics:
  - ECS: CPU, memory, request count
  - ALB: Latency, 4xx, 5xx errors
  - RDS: Connections, disk I/O, CPU
- Alarms:
  - API error rate >5% → PagerDuty
  - Database CPU >80% → Email
  - ECS memory >90% → Auto-scale

**GuardDuty:**
- Threat detection for EC2, S3, IAM
- Findings → EventBridge → Lambda → Slack alert

**Security Hub:**
- CIS AWS Foundations Benchmark
- HIPAA compliance checks
- Weekly compliance reports

## Deployment

### Prerequisites

- AWS CLI v2 installed and configured
- Terraform v1.5+ installed
- Docker installed (for building images)
- Valid AWS account with Administrator access

### Environment Setup

```bash
# Clone repository
git clone https://github.com/your-org/eldercare.git
cd eldercare/infrastructure/aws

# Initialize Terraform
terraform init

# Set environment variables
export AWS_PROFILE=eldercare-prod
export TF_VAR_environment=production
export TF_VAR_db_password=$(openssl rand -base64 32)
```

### Deployment Steps

**1. Plan Infrastructure:**
```bash
terraform plan -out=tfplan
```

**2. Apply Infrastructure:**
```bash
terraform apply tfplan
```

**3. Deploy Backend API:**
```bash
# Build Docker image
cd ../../backend
docker build -t eldercare-api:latest .

# Tag for ECR
docker tag eldercare-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/eldercare-api:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/eldercare-api:latest

# Update ECS service
aws ecs update-service --cluster eldercare-cluster --service eldercare-api --force-new-deployment
```

**4. Run Database Migrations:**
```bash
# Connect to bastion host (or use AWS Systems Manager Session Manager)
npm run migration:run
```

### Disaster Recovery

**Multi-Region Failover:**

Primary: `us-east-1` (N. Virginia)
DR: `us-west-2` (Oregon)

**Failover Procedure:**

1. **Automated Failover (RDS):**
   - Multi-AZ failover: <2 minutes (automatic)
   - No manual intervention required

2. **Manual Region Failover:**
   ```bash
   # 1. Promote RDS read replica in us-west-2
   aws rds promote-read-replica --db-instance-identifier eldercare-db-replica-west

   # 2. Update Route 53 weighted routing
   aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://failover.json

   # 3. Scale up ECS in us-west-2
   aws ecs update-service --cluster eldercare-cluster-west --service eldercare-api --desired-count 10
   ```

**RTO:** 1 hour
**RPO:** 5 minutes (replication lag)

### Cost Estimation

**Monthly AWS Costs (1,000 devices, 10,000 users):**

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **ECS Fargate** | 2-10 tasks avg, 1 vCPU, 2 GB | $100 |
| **ALB** | 1 ALB, 1M requests | $25 |
| **RDS PostgreSQL** | db.r6g.xlarge, Multi-AZ | $450 |
| **ElastiCache Redis** | 3× cache.r6g.large | $300 |
| **S3** | 100 GB standard, 500 GB Glacier | $20 |
| **CloudFront** | 500 GB transfer | $50 |
| **AWS IoT Core** | 1K devices, 10M messages | $80 |
| **Lambda** | 10M invocations, 512 MB | $40 |
| **CloudWatch** | Logs, metrics, alarms | $30 |
| **Data Transfer** | 500 GB outbound | $45 |
| **Total** | | **~$1,140/month** |

**Cost at Scale (100,000 devices, 1M users):**
- Monthly: ~$12,000
- Annual: ~$144,000

**Cost Optimization:**
- Reserved Instances (RDS): Save 40%
- Savings Plans (ECS): Save 30%
- S3 Intelligent-Tiering: Save 20%
- Optimized Cost: ~$8,500/month

## Security Compliance

### HIPAA Compliance Checklist

- [x] Encryption at rest (RDS, S3, EBS)
- [x] Encryption in transit (TLS 1.3)
- [x] VPC isolation (no public IPs for databases)
- [x] IAM least privilege (role-based access)
- [x] Audit logging (CloudTrail, CloudWatch)
- [x] Multi-factor authentication (MFA for console)
- [x] Backup and recovery (automated, tested)
- [x] Incident response (GuardDuty alerts)
- [x] Business Associate Agreement with AWS

### PCI DSS (If Handling Payments)

- [x] Firewall configuration (Security Groups, NACLs)
- [x] No default passwords (Secrets Manager)
- [x] Encrypted cardholder data (not stored, tokenized via Stripe)
- [x] Transmission encryption (TLS 1.3)
- [x] Antivirus (managed by AWS for underlying infrastructure)
- [x] Secure development (code review, SAST)
- [x] Access control (IAM, MFA)
- [x] Monitoring and testing (CloudWatch, penetration tests)
- [x] Information security policy (documented)

## Operations

### Runbook: API Deployment

**Zero-Downtime Deployment:**

1. Build new Docker image
2. Push to ECR with new tag
3. Update task definition with new image tag
4. ECS rolling update:
   - Start new tasks (with new image)
   - Health check passes
   - Drain connections from old tasks
   - Terminate old tasks
5. Monitor CloudWatch metrics (error rate, latency)
6. Rollback if errors >5%

**Rollback Procedure:**
```bash
# Revert to previous task definition
aws ecs update-service --cluster eldercare-cluster --service eldercare-api --task-definition eldercare-api:42
```

### Runbook: Database Scaling

**Vertical Scaling (More Resources):**

```bash
# Modify instance class
aws rds modify-db-instance \
  --db-instance-identifier eldercare-db \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately
```

Downtime: ~5 minutes (during maintenance window)

**Horizontal Scaling (Read Replicas):**

```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier eldercare-db-replica-1 \
  --source-db-instance-identifier eldercare-db \
  --db-instance-class db.r6g.large
```

Configure backend to use read replica for analytics queries.

### Runbook: Handling Traffic Spike

**Auto-Scaling Triggers:**
- CloudWatch Alarm: `TargetTracking-ECS-CPU-70%`
- Action: Scale out (add 2 tasks every 2 minutes, max 20)

**Manual Scaling:**
```bash
# Immediately scale to 20 tasks
aws ecs update-service --cluster eldercare-cluster --service eldercare-api --desired-count 20
```

**Rate Limiting:**
- API Gateway (if using): 1000 requests/second per API key
- WAF: Rate-based rule (2000 requests/5 minutes per IP)

## Troubleshooting

### Issue: High Database CPU

**Symptoms:**
- CloudWatch alarm: `RDS-CPU-High`
- API latency >1 second

**Diagnosis:**
```sql
-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';
```

**Resolution:**
1. Optimize slow queries (add indexes)
2. Scale up RDS instance class
3. Add read replica for analytics
4. Enable connection pooling (PgBouncer)

### Issue: IoT Device Disconnections

**Symptoms:**
- CloudWatch metric: `AWS/IoT/ClientError` spike
- Devices showing offline in registry

**Diagnosis:**
```bash
# Check IoT Core logs
aws logs tail /aws/iot/events --follow

# Check device connectivity
aws iot describe-thing --thing-name DEVICE_001
```

**Resolution:**
1. Check device certificates (not expired?)
2. Verify device internet connectivity
3. Check IoT Core quotas (5000 connections/second limit)
4. Review firmware logs (connection errors)

### Issue: ECS Task Failures

**Symptoms:**
- ECS service event: `service eldercare-api was unable to place a task`
- 503 errors from ALB

**Diagnosis:**
```bash
# Check task stopped reason
aws ecs describe-tasks --cluster eldercare-cluster --tasks <task-id>

# Check CloudWatch logs
aws logs tail /ecs/eldercare-api --follow
```

**Common Causes:**
- Out of memory (OOMKilled) → Increase task memory
- Failed health checks → Fix application bug
- ECR image pull error → Check IAM permissions
- No available IPs in subnets → Expand VPC subnets

## Terraform Modules

```
infrastructure/aws/
├── main.tf                 # Root module
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── modules/
│   ├── networking/         # VPC, subnets, security groups
│   ├── compute/            # ECS cluster, task definitions
│   ├── database/           # RDS, ElastiCache
│   ├── storage/            # S3 buckets
│   ├── iot/                # IoT Core, device registry
│   ├── monitoring/         # CloudWatch, GuardDuty
│   └── cdn/                # CloudFront distributions
└── environments/
    ├── dev/                # Development environment
    ├── staging/            # Staging environment
    └── production/         # Production environment
```

## CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        run: aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

      - name: Build and push Docker image
        run: |
          docker build -t eldercare-api:$GITHUB_SHA .
          docker tag eldercare-api:$GITHUB_SHA $ECR_REGISTRY/eldercare-api:latest
          docker push $ECR_REGISTRY/eldercare-api:latest

      - name: Deploy to ECS
        run: aws ecs update-service --cluster eldercare-cluster --service eldercare-api --force-new-deployment

      - name: Wait for deployment
        run: aws ecs wait services-stable --cluster eldercare-cluster --services eldercare-api
```

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Owner:** DevOps Team
