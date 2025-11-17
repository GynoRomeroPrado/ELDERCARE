terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "eldercare-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "eldercare-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ELDERCARE+"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner_email
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local variables
locals {
  account_id = data.aws_caller_identity.current.account_id
  azs        = slice(data.aws_availability_zones.available.names, 0, 2)

  common_tags = {
    Project     = "ELDERCARE+"
    Environment = var.environment
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = local.azs
  enable_nat_gateway  = true
  single_nat_gateway  = var.environment != "production"
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security_groups"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# RDS Module (PostgreSQL with TimescaleDB)
module "rds" {
  source = "./modules/rds"

  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  database_subnet_ids  = module.vpc.database_subnet_ids
  security_group_id    = module.security_groups.rds_security_group_id

  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  multi_az             = var.environment == "production"

  database_name        = var.db_name
  master_username      = var.db_username
  master_password      = var.db_password

  backup_retention_period = var.environment == "production" ? 35 : 7
  skip_final_snapshot     = var.environment != "production"
}

# ElastiCache Module (Redis)
module "elasticache" {
  source = "./modules/elasticache"

  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnet_ids
  security_group_id    = module.security_groups.redis_security_group_id

  node_type            = var.redis_node_type
  num_cache_nodes      = var.environment == "production" ? 3 : 1
  parameter_group_name = "default.redis7"
}

# ECS Cluster Module
module "ecs" {
  source = "./modules/ecs"

  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  security_group_id    = module.security_groups.ecs_security_group_id

  cluster_name         = "eldercare-cluster"

  # Backend API service
  service_name         = "eldercare-api"
  container_image      = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/eldercare-api:latest"
  container_port       = 3000
  cpu                  = 1024
  memory               = 2048
  desired_count        = var.environment == "production" ? 2 : 1

  # Auto-scaling
  min_capacity         = 2
  max_capacity         = var.environment == "production" ? 20 : 5
  target_cpu_percent   = 70
  target_memory_percent = 80

  # Environment variables
  environment_variables = {
    NODE_ENV        = var.environment
    PORT            = "3000"
    DB_HOST         = module.rds.db_endpoint
    DB_PORT         = "5432"
    DB_NAME         = var.db_name
    DB_USERNAME     = var.db_username
    REDIS_HOST      = module.elasticache.redis_endpoint
    REDIS_PORT      = "6379"
    AWS_REGION      = var.aws_region
  }

  # Secrets
  secrets = {
    DB_PASSWORD = module.rds.db_password_secret_arn
  }

  # Load balancer target group
  alb_target_group_arn = module.alb.target_group_arn
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"

  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  public_subnet_ids    = module.vpc.public_subnet_ids
  security_group_id    = module.security_groups.alb_security_group_id

  certificate_arn      = var.acm_certificate_arn
  health_check_path    = "/health"
}

# AWS IoT Core Module
module "iot" {
  source = "./modules/iot"

  environment = var.environment

  # Thing types
  thing_types = [
    "pill-dispenser",
    "fall-sensor",
    "environmental-sensor",
    "emergency-button"
  ]

  # IoT Rules
  rules = {
    telemetry_to_kinesis = {
      sql         = "SELECT * FROM 'eldercare/+/telemetry'"
      description = "Route telemetry data to Kinesis"
      actions = [{
        kinesis = {
          stream_name = module.kinesis.stream_name
          partition_key = "$${topic()}"
        }
      }]
    }

    alerts_to_lambda = {
      sql         = "SELECT * FROM 'eldercare/+/events/+'"
      description = "Route alerts to Lambda for processing"
      actions = [{
        lambda = {
          function_arn = module.lambda.alert_processor_arn
        }
      }]
    }
  }
}

# Lambda Functions Module
module "lambda" {
  source = "./modules/lambda"

  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_group_id = module.security_groups.lambda_security_group_id

  # Alert processor function
  create_alert_processor = true

  # Device ingest function
  create_device_ingest = true

  environment_variables = {
    DB_HOST      = module.rds.db_endpoint
    REDIS_HOST   = module.elasticache.redis_endpoint
    SNS_TOPIC_ARN = module.sns.topic_arn
  }
}

# S3 Buckets Module
module "s3" {
  source = "./modules/s3"

  environment = var.environment

  # Telemetry bucket
  create_telemetry_bucket = true
  telemetry_lifecycle_rules = {
    transition_to_glacier_days = 90
    expiration_days            = 2555 # 7 years
  }

  # Uploads bucket
  create_uploads_bucket = true
  uploads_versioning    = true

  # Backups bucket
  create_backups_bucket = true
  backups_replication_region = "us-west-2"
  backups_mfa_delete    = var.environment == "production"
}

# CloudFront Distribution Module
module "cloudfront" {
  source = "./modules/cloudfront"

  environment     = var.environment
  alb_domain_name = module.alb.dns_name
  s3_bucket_domain = module.s3.uploads_bucket_domain

  acm_certificate_arn = var.acm_certificate_arn_us_east_1
  domain_name         = var.domain_name

  waf_enabled = var.environment == "production"
}

# CloudWatch Monitoring Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment  = var.environment
  cluster_name = module.ecs.cluster_name
  service_name = module.ecs.service_name

  # Alarms
  alb_target_group_arn = module.alb.target_group_arn
  rds_instance_id      = module.rds.db_instance_id

  # SNS topic for alerts
  alarm_sns_topic_arn = module.sns.topic_arn
}

# SNS Topics Module
module "sns" {
  source = "./modules/sns"

  environment = var.environment

  topics = {
    alerts = {
      name         = "eldercare-alerts"
      display_name = "ELDERCARE+ Alerts"
    }
    alarms = {
      name         = "eldercare-alarms"
      display_name = "ELDERCARE+ CloudWatch Alarms"
    }
  }

  subscriptions = {
    pagerduty_email = var.pagerduty_email
    ops_team_email  = var.ops_team_email
  }
}

# Kinesis Data Streams Module
module "kinesis" {
  source = "./modules/kinesis"

  environment  = var.environment
  stream_name  = "eldercare-telemetry"
  shard_count  = var.environment == "production" ? 5 : 1

  retention_period = 168 # 7 days
}

# KMS Keys Module
module "kms" {
  source = "./modules/kms"

  environment = var.environment

  keys = {
    rds = {
      description = "KMS key for RDS encryption"
      alias       = "eldercare-rds"
    }
    s3 = {
      description = "KMS key for S3 encryption"
      alias       = "eldercare-s3"
    }
    secrets = {
      description = "KMS key for Secrets Manager"
      alias       = "eldercare-secrets"
    }
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name        = "eldercare-${var.environment}-db-password"
  description = "Database master password"
  kms_key_id  = module.kms.secrets_key_id

  lifecycle {
    ignore_changes = [name]
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = var.environment == "production"

  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = false
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
}

# AWS Config
resource "aws_config_configuration_recorder" "main" {
  count = var.environment == "production" ? 1 : 0

  name     = "eldercare-config-recorder"
  role_arn = aws_iam_role.config[0].arn

  recording_group {
    all_supported = true
    include_global_resource_types = true
  }
}

resource "aws_iam_role" "config" {
  count = var.environment == "production" ? 1 : 0

  name = "eldercare-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "config.amazonaws.com"
      }
    }]
  })
}
