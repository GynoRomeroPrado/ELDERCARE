/**
 * Telemedicine Module
 * Video consultations using Twilio Video API
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemedicineController } from './telemedicine.controller';
import { TelemedicineService } from './telemedicine.service';
import { TwilioVideoService } from './twilio-video.service';
import { VideoSession } from './entities/video-session.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoSession]),
    UsersModule,
  ],
  controllers: [TelemedicineController],
  providers: [TelemedicineService, TwilioVideoService],
  exports: [TelemedicineService],
})
export class TelemedicineModule {}
