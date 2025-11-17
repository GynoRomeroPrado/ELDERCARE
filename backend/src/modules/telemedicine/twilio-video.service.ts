/**
 * Twilio Video Service
 * Handles Twilio Video API integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import * as jwt from 'jsonwebtoken';

export interface RoomOptions {
  uniqueName: string;
  type?: 'group' | 'peer-to-peer' | 'group-small';
  recordParticipantsOnConnect?: boolean;
  maxParticipants?: number;
}

export interface AccessTokenOptions {
  identity: string;
  roomName: string;
  ttl?: number;
}

@Injectable()
export class TwilioVideoService {
  private readonly logger = new Logger(TwilioVideoService.name);
  private twilioClient: twilio.Twilio;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.apiKey = this.configService.get<string>('TWILIO_VIDEO_API_KEY');
    this.apiSecret = this.configService.get<string>('TWILIO_VIDEO_API_SECRET');

    this.twilioClient = twilio(this.accountSid, this.authToken);
  }

  /**
   * Create a Twilio Video room
   */
  async createRoom(options: RoomOptions): Promise<any> {
    try {
      const room = await this.twilioClient.video.v1.rooms.create({
        uniqueName: options.uniqueName,
        type: options.type || 'group-small',
        recordParticipantsOnConnect: options.recordParticipantsOnConnect || false,
        maxParticipants: options.maxParticipants || 10,
      });

      this.logger.log(`Created Twilio room: ${room.sid} (${room.uniqueName})`);

      return {
        sid: room.sid,
        uniqueName: room.uniqueName,
        status: room.status,
        type: room.type,
        maxParticipants: room.maxParticipants,
        duration: room.duration,
        url: room.url,
        createdAt: room.dateCreated,
      };
    } catch (error) {
      this.logger.error(`Failed to create Twilio room: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get room details
   */
  async getRoom(roomSid: string): Promise<any> {
    try {
      const room = await this.twilioClient.video.v1.rooms(roomSid).fetch();

      return {
        sid: room.sid,
        uniqueName: room.uniqueName,
        status: room.status,
        type: room.type,
        duration: room.duration,
        maxParticipants: room.maxParticipants,
        participants: await this.getRoomParticipants(roomSid),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch room ${roomSid}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get participants in a room
   */
  async getRoomParticipants(roomSid: string): Promise<any[]> {
    try {
      const participants = await this.twilioClient.video.v1
        .rooms(roomSid)
        .participants.list();

      return participants.map((p) => ({
        sid: p.sid,
        identity: p.identity,
        status: p.status,
        duration: p.duration,
        startTime: p.startTime,
        endTime: p.endTime,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch participants for room ${roomSid}`);
      throw error;
    }
  }

  /**
   * End a video room
   */
  async endRoom(roomSid: string): Promise<void> {
    try {
      await this.twilioClient.video.v1
        .rooms(roomSid)
        .update({ status: 'completed' });

      this.logger.log(`Ended Twilio room: ${roomSid}`);
    } catch (error) {
      this.logger.error(`Failed to end room ${roomSid}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate access token for participant
   */
  generateAccessToken(options: AccessTokenOptions): string {
    const { identity, roomName, ttl = 3600 } = options;

    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    // Create access token
    const token = new AccessToken(
      this.accountSid,
      this.apiKey,
      this.apiSecret,
      {
        ttl, // Token valid for 1 hour by default
        identity,
      },
    );

    // Create video grant
    const videoGrant = new VideoGrant({
      room: roomName,
    });

    token.addGrant(videoGrant);

    this.logger.log(`Generated access token for ${identity} in room ${roomName}`);

    return token.toJwt();
  }

  /**
   * List all active rooms
   */
  async listActiveRooms(): Promise<any[]> {
    try {
      const rooms = await this.twilioClient.video.v1.rooms.list({
        status: 'in-progress',
        limit: 50,
      });

      return rooms.map((room) => ({
        sid: room.sid,
        uniqueName: room.uniqueName,
        status: room.status,
        type: room.type,
        duration: room.duration,
        maxParticipants: room.maxParticipants,
      }));
    } catch (error) {
      this.logger.error('Failed to list active rooms');
      throw error;
    }
  }

  /**
   * Get room recordings
   */
  async getRoomRecordings(roomSid: string): Promise<any[]> {
    try {
      const recordings = await this.twilioClient.video.v1
        .rooms(roomSid)
        .recordings.list();

      return recordings.map((r) => ({
        sid: r.sid,
        status: r.status,
        duration: r.duration,
        size: r.size,
        url: r.url,
        mediaUrl: r.mediaUrl,
        createdAt: r.dateCreated,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch recordings for room ${roomSid}`);
      throw error;
    }
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(roomSid: string, participantSid: string): Promise<void> {
    try {
      await this.twilioClient.video.v1
        .rooms(roomSid)
        .participants(participantSid)
        .update({ status: 'disconnected' });

      this.logger.log(`Removed participant ${participantSid} from room ${roomSid}`);
    } catch (error) {
      this.logger.error(`Failed to remove participant: ${error.message}`);
      throw error;
    }
  }
}
