/**
 * ELDERCARE+ Backend API
 * Main entry point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as WinstonCloudWatch from 'winston-cloudwatch';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Winston logger configuration
  const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  });

  // Add CloudWatch logging in production
  if (process.env.NODE_ENV === 'production') {
    winstonLogger.add(
      new WinstonCloudWatch({
        logGroupName: '/eldercare/backend',
        logStreamName: `api-${new Date().toISOString().split('T')[0]}`,
        awsRegion: process.env.AWS_REGION || 'us-east-1',
      }),
    );
  }

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: winstonLogger,
    }),
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ELDERCARE+ API')
    .setDescription('Comprehensive elderly care coordination platform API')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('devices', 'IoT device management')
    .addTag('telemetry', 'Device telemetry data')
    .addTag('alerts', 'Alert management')
    .addTag('medication', 'Medication management')
    .addTag('falls', 'Fall detection events')
    .addTag('family', 'Family coordination')
    .addTag('telemedicine', 'Telemedicine sessions')
    .addTag('analytics', 'Analytics and insights')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  logger.log(`🚀 ELDERCARE+ API running on port ${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
