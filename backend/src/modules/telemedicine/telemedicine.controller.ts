/**
 * Telemedicine Controller
 * REST API for video consultations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TelemedicineService } from './telemedicine.service';

@ApiTags('telemedicine')
@ApiBearerAuth()
@Controller('telemedicine')
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  @Post('sessions')
  @ApiOperation({
    summary: 'Schedule a video consultation',
    description: 'Creates a new telemedicine session between elder and healthcare provider',
  })
  @ApiResponse({
    status: 201,
    description: 'Session scheduled successfully',
  })
  async scheduleSession(@Body() createSessionDto: any, @Request() req) {
    return this.telemedicineService.scheduleSession(createSessionDto);
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get user video sessions',
    description: 'Retrieves all video sessions for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of video sessions',
  })
  async getUserSessions(@Query() query: any, @Request() req) {
    return this.telemedicineService.getUserSessions(req.user.id, query);
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Get session details',
  })
  @ApiParam({
    name: 'id',
    description: 'Session UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Session details',
  })
  async getSession(@Param('id') id: string) {
    return this.telemedicineService.getSession(id);
  }

  @Post('sessions/:id/start')
  @ApiOperation({
    summary: 'Start a video session',
    description: 'Creates Twilio video room and returns access token',
  })
  @ApiResponse({
    status: 200,
    description: 'Session started, returns access token',
  })
  async startSession(@Param('id') id: string, @Request() req) {
    return this.telemedicineService.startSession(id, req.user.id);
  }

  @Post('sessions/:id/join')
  @ApiOperation({
    summary: 'Join a video session',
    description: 'Generates access token to join an existing video session',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token generated',
  })
  async joinSession(@Param('id') id: string, @Request() req) {
    return this.telemedicineService.joinSession(id, req.user.id);
  }

  @Post('sessions/:id/end')
  @ApiOperation({
    summary: 'End a video session',
    description: 'Ends the video session and closes Twilio room',
  })
  @ApiResponse({
    status: 200,
    description: 'Session ended successfully',
  })
  async endSession(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.telemedicineService.endSession(id, req.user.id, body.notes);
  }

  @Put('sessions/:id/notes')
  @ApiOperation({
    summary: 'Update session clinical notes',
    description: 'Provider updates diagnosis, prescriptions, and follow-up info',
  })
  @ApiResponse({
    status: 200,
    description: 'Notes updated successfully',
  })
  async updateNotes(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.telemedicineService.updateSessionNotes(id, req.user.id, data);
  }

  @Post('sessions/:id/cancel')
  @ApiOperation({
    summary: 'Cancel a scheduled session',
  })
  @ApiResponse({
    status: 200,
    description: 'Session cancelled',
  })
  async cancelSession(@Param('id') id: string, @Request() req) {
    return this.telemedicineService.cancelSession(id, req.user.id);
  }
}
