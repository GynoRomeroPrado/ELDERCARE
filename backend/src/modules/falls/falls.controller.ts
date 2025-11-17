import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FallsService } from './falls.service';
import { CreateFallEventDto, UpdateFallEventDto, FallEventQueryDto } from './dto';

@ApiTags('falls')
@ApiBearerAuth()
@Controller('falls')
@UseGuards(JwtAuthGuard)
export class FallsController {
  constructor(private readonly fallsService: FallsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all fall events for user' })
  @ApiResponse({ status: 200, description: 'Fall events retrieved successfully' })
  async findAll(@Request() req, @Query() query: FallEventQueryDto) {
    return this.fallsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fall event by ID' })
  @ApiResponse({ status: 200, description: 'Fall event found' })
  @ApiResponse({ status: 404, description: 'Fall event not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.fallsService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new fall event (from device)' })
  @ApiResponse({ status: 201, description: 'Fall event created successfully' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateFallEventDto, @Request() req) {
    return this.fallsService.create(createDto, req.user.id);
  }

  @Put(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge fall event' })
  @ApiResponse({ status: 200, description: 'Fall event acknowledged' })
  async acknowledge(@Param('id') id: string, @Request() req) {
    return this.fallsService.acknowledge(id, req.user.id);
  }

  @Put(':id/false-alarm')
  @ApiOperation({ summary: 'Mark fall event as false alarm' })
  @ApiResponse({ status: 200, description: 'Fall event marked as false alarm' })
  async markFalseAlarm(@Param('id') id: string, @Request() req) {
    return this.fallsService.markFalseAlarm(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update fall event details' })
  @ApiResponse({ status: 200, description: 'Fall event updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFallEventDto,
    @Request() req,
  ) {
    return this.fallsService.update(id, updateDto, req.user.id);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get fall statistics summary' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(@Request() req, @Query('days') days: number = 30) {
    return this.fallsService.getStatistics(req.user.id, days);
  }

  @Post(':id/emergency')
  @ApiOperation({ summary: 'Call emergency services for fall event' })
  @ApiResponse({ status: 200, description: 'Emergency services contacted' })
  async callEmergency(@Param('id') id: string, @Request() req) {
    return this.fallsService.callEmergencyServices(id, req.user.id);
  }
}
