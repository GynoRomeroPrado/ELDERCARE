/**
 * Telemedicine Service
 * Business logic for video consultations
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoSession, SessionStatus } from './entities/video-session.entity';
import { TwilioVideoService } from './twilio-video.service';
import { User } from '../users/entities/user.entity';

export interface CreateSessionDto {
  elderId: string;
  providerId: string;
  scheduledAt: Date;
  type?: string;
  chiefComplaint?: string;
  recordingEnabled?: boolean;
}

export interface JoinSessionResult {
  sessionId: string;
  roomName: string;
  accessToken: string;
  roomSid: string;
}

@Injectable()
export class TelemedicineService {
  private readonly logger = new Logger(TelemedicineService.name);

  constructor(
    @InjectRepository(VideoSession)
    private sessionRepository: Repository<VideoSession>,
    private twilioVideoService: TwilioVideoService,
  ) {}

  /**
   * Schedule a new video consultation
   */
  async scheduleSession(data: CreateSessionDto): Promise<VideoSession> {
    const roomName = `eldercare-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const session = this.sessionRepository.create({
      elderId: data.elderId,
      providerId: data.providerId,
      scheduledAt: data.scheduledAt,
      type: data.type as any,
      chiefComplaint: data.chiefComplaint,
      recordingEnabled: data.recordingEnabled || false,
      roomName,
      status: SessionStatus.SCHEDULED,
    });

    await this.sessionRepository.save(session);

    this.logger.log(`Scheduled video session ${session.id} for ${data.scheduledAt}`);

    return session;
  }

  /**
   * Start a video session (create Twilio room)
   */
  async startSession(sessionId: string, userId: string): Promise<JoinSessionResult> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['elder', 'provider'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only elder or provider can start the session
    if (session.elderId !== userId && session.providerId !== userId) {
      throw new BadRequestException('Unauthorized to start this session');
    }

    // Check if session is already in progress
    if (session.status === SessionStatus.IN_PROGRESS) {
      // Return existing room info
      return this.joinSession(sessionId, userId);
    }

    // Check if session is scheduled in the future
    const now = new Date();
    const scheduledTime = new Date(session.scheduledAt);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesUntilStart = timeDiff / (1000 * 60);

    if (minutesUntilStart > 15) {
      throw new BadRequestException('Session cannot be started more than 15 minutes early');
    }

    // Create Twilio room
    const room = await this.twilioVideoService.createRoom({
      uniqueName: session.roomName,
      type: 'group-small',
      recordParticipantsOnConnect: session.recordingEnabled,
      maxParticipants: 5, // Elder + provider + up to 3 family members
    });

    // Update session
    session.roomSid = room.sid;
    session.status = SessionStatus.IN_PROGRESS;
    session.startedAt = new Date();
    await this.sessionRepository.save(session);

    // Generate access token
    const userRole = session.elderId === userId ? 'elder' : 'provider';
    const identity = `${userRole}-${userId}`;
    const accessToken = this.twilioVideoService.generateAccessToken({
      identity,
      roomName: session.roomName,
      ttl: 7200, // 2 hours
    });

    this.logger.log(`Started video session ${sessionId}, room ${room.sid}`);

    return {
      sessionId: session.id,
      roomName: session.roomName,
      roomSid: room.sid,
      accessToken,
    };
  }

  /**
   * Join an existing video session
   */
  async joinSession(sessionId: string, userId: string): Promise<JoinSessionResult> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['elder', 'provider'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.roomSid) {
      throw new BadRequestException('Session has not been started yet');
    }

    // Determine user role
    let identity: string;
    if (session.elderId === userId) {
      identity = `elder-${userId}`;
    } else if (session.providerId === userId) {
      identity = `provider-${userId}`;
    } else {
      identity = `family-${userId}`;
    }

    // Generate access token
    const accessToken = this.twilioVideoService.generateAccessToken({
      identity,
      roomName: session.roomName,
      ttl: 7200,
    });

    return {
      sessionId: session.id,
      roomName: session.roomName,
      roomSid: session.roomSid,
      accessToken,
    };
  }

  /**
   * End a video session
   */
  async endSession(sessionId: string, userId: string, notes?: string): Promise<VideoSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['elder', 'provider'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only provider can end the session
    if (session.providerId !== userId) {
      throw new BadRequestException('Only the provider can end the session');
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }

    // End Twilio room
    if (session.roomSid) {
      await this.twilioVideoService.endRoom(session.roomSid);
    }

    // Update session
    session.status = SessionStatus.COMPLETED;
    session.endedAt = new Date();
    session.durationSeconds = Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );

    if (notes) {
      session.notes = notes;
    }

    await this.sessionRepository.save(session);

    this.logger.log(`Ended video session ${sessionId}, duration: ${session.durationSeconds}s`);

    return session;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<VideoSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['elder', 'provider'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * List sessions for a user
   */
  async getUserSessions(
    userId: string,
    options?: { status?: SessionStatus; limit?: number },
  ): Promise<VideoSession[]> {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.elder', 'elder')
      .leftJoinAndSelect('session.provider', 'provider')
      .where('session.elder_id = :userId OR session.provider_id = :userId', { userId })
      .orderBy('session.scheduled_at', 'DESC');

    if (options?.status) {
      query.andWhere('session.status = :status', { status: options.status });
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    return query.getMany();
  }

  /**
   * Cancel a scheduled session
   */
  async cancelSession(sessionId: string, userId: string): Promise<VideoSession> {
    const session = await this.getSession(sessionId);

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be cancelled');
    }

    session.status = SessionStatus.CANCELLED;
    await this.sessionRepository.save(session);

    this.logger.log(`Cancelled video session ${sessionId}`);

    return session;
  }

  /**
   * Update session notes (provider only)
   */
  async updateSessionNotes(
    sessionId: string,
    providerId: string,
    data: {
      notes?: string;
      diagnosis?: any;
      prescriptions?: any;
      followUpRequired?: boolean;
      followUpDate?: Date;
    },
  ): Promise<VideoSession> {
    const session = await this.getSession(sessionId);

    if (session.providerId !== providerId) {
      throw new BadRequestException('Only the provider can update session notes');
    }

    Object.assign(session, data);
    await this.sessionRepository.save(session);

    return session;
  }
}
