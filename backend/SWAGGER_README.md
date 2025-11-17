# Swagger/OpenAPI Documentation Guide

ELDERCARE+ API uses Swagger/OpenAPI 3.0 for comprehensive API documentation.

## Accessing Documentation

### Local Development

```
http://localhost:3000/api/docs
```

### Staging

```
https://api-staging.eldercare.com/api/docs
```

### Production

```
https://api.eldercare.com/api/docs
```

## Features

- **Interactive Documentation**: Try API endpoints directly from the browser
- **Authentication**: Test with JWT Bearer tokens
- **Request/Response Examples**: See example data for all endpoints
- **Schema Validation**: View DTO validation rules
- **Download OpenAPI Spec**: Export JSON/YAML spec

## Configuration

Swagger is configured in `src/main.ts`:

```typescript
const swaggerConfig = new DocumentBuilder()
  .setTitle('ELDERCARE+ API')
  .setDescription('Comprehensive elderly care coordination platform API')
  .setVersion('1.0')
  .addTag('auth', 'Authentication endpoints')
  .addTag('devices', 'IoT device management')
  .addTag('falls', 'Fall detection events')
  .addTag('medication', 'Medication management')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api/docs', app, document);
```

## Decorating DTOs

### Basic DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Device serial number',
    example: 'PILL-001-2024',
  })
  @IsString()
  serialNumber: string;

  @ApiPropertyOptional({
    description: 'Battery level percentage',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel?: number;
}
```

### Enum Properties

```typescript
export enum DeviceType {
  PILL_DISPENSER = 'PILL_DISPENSER',
  FALL_SENSOR = 'FALL_SENSOR',
}

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Type of IoT device',
    enum: DeviceType,
    example: DeviceType.PILL_DISPENSER,
  })
  @IsEnum(DeviceType)
  deviceType: DeviceType;
}
```

### Nested Objects

```typescript
@ApiProperty({
  description: 'Device location coordinates',
  example: {
    latitude: 40.7128,
    longitude: -74.0060,
  },
})
@IsObject()
coordinates: {
  latitude: number;
  longitude: number;
};
```

### Arrays

```typescript
@ApiProperty({
  description: 'Array of medication names',
  example: ['Aspirin', 'Metformin'],
  type: [String],
})
@IsArray()
@IsString({ each: true })
medications: string[];
```

## Decorating Controllers

### Basic Endpoint

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  @Post()
  @ApiOperation({
    summary: 'Register a new IoT device',
    description: 'Registers a new pill dispenser or fall sensor device',
  })
  @ApiResponse({
    status: 201,
    description: 'Device registered successfully',
    type: DeviceResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 409,
    description: 'Device already exists',
  })
  async create(@Body() createDto: CreateDeviceDto) {
    // ...
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get device by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Device UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Device found',
    type: DeviceResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async findOne(@Param('id') id: string) {
    // ...
  }
}
```

### Query Parameters

```typescript
@Get()
@ApiOperation({ summary: 'List all devices' })
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  example: 10,
})
@ApiQuery({
  name: 'type',
  required: false,
  enum: DeviceType,
})
async findAll(
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  @Query('type') type?: DeviceType,
) {
  // ...
}
```

### Custom Error Responses

```typescript
@ApiResponse({
  status: 400,
  description: 'Validation failed',
  schema: {
    example: {
      statusCode: 400,
      message: [
        'deviceType must be a valid enum value',
        'serialNumber should not be empty',
      ],
      error: 'Bad Request',
    },
  },
})
```

## Response Models

Create response models for consistent API documentation:

```typescript
export class DeviceResponse {
  @ApiProperty({
    description: 'Device UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Device type',
    enum: DeviceType,
    example: DeviceType.PILL_DISPENSER,
  })
  deviceType: DeviceType;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-11-17T10:30:00.000Z',
  })
  createdAt: Date;
}

export class DeviceListResponse {
  @ApiProperty({
    description: 'Array of devices',
    type: [DeviceResponse],
  })
  data: DeviceResponse[];

  @ApiProperty({
    description: 'Total count',
    example: 42,
  })
  total: number;
}
```

## Authentication

### Adding Bearer Token

In Swagger UI:

1. Click "Authorize" button (top right)
2. Enter JWT token: `Bearer <your_token>`
3. Click "Authorize"
4. All subsequent requests will include the token

### Getting a Token

```bash
# Login to get token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@eldercare.com","password":"password"}'

# Response includes accessToken
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

## Trying Endpoints

### Example: Create Fall Event

1. Navigate to **POST /api/v1/falls**
2. Click "Try it out"
3. Edit the request body:

```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "detectedAt": "2024-11-17T10:30:00.000Z",
  "severity": "HIGH",
  "confidence": 0.95,
  "sensorData": {
    "radarPointCloud": {
      "points": 150
    }
  }
}
```

4. Click "Execute"
5. View response

## Exporting OpenAPI Spec

### JSON Format

```
http://localhost:3000/api/docs-json
```

### YAML Format

Install swagger-ui-express plugin or use online converter:

```bash
# Download JSON
curl http://localhost:3000/api/docs-json > openapi.json

# Convert to YAML (using npx)
npx @apidevtools/swagger-cli bundle openapi.json -o openapi.yaml -t yaml
```

## Code Generation

Generate client SDKs from OpenAPI spec:

### TypeScript SDK

```bash
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api/docs-json \
  -g typescript-axios \
  -o ./sdk/typescript
```

### Python SDK

```bash
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api/docs-json \
  -g python \
  -o ./sdk/python
```

### Other Languages

Supports 50+ languages:
- Java
- C#
- Go
- Ruby
- PHP
- Swift
- Kotlin

## Best Practices

### 1. Always Document

Every endpoint should have:
- `@ApiOperation` with summary and description
- `@ApiResponse` for all status codes
- Parameter descriptions

### 2. Use Examples

Provide realistic examples:

```typescript
@ApiProperty({
  description: 'User email address',
  example: 'john.doe@eldercare.com', // ✅ GOOD
  // example: 'string', // ❌ BAD
})
```

### 3. Document Errors

```typescript
@ApiResponse({
  status: 400,
  description: 'Validation failed',
  schema: {
    example: {
      statusCode: 400,
      message: ['Field error'],
      error: 'Bad Request',
    },
  },
})
```

### 4. Group Related Endpoints

```typescript
@ApiTags('falls') // Groups all fall-related endpoints
@Controller('falls')
export class FallsController {
  // ...
}
```

### 5. Deprecate Endpoints

```typescript
@ApiOperation({
  summary: 'Old endpoint',
  deprecated: true,
})
@Get('old-endpoint')
async oldEndpoint() {
  // ...
}
```

## Testing with Swagger

### Manual Testing

1. Open Swagger UI
2. Authenticate with JWT token
3. Try each endpoint
4. Verify responses match documentation

### Automated Testing

Export OpenAPI spec and use for contract testing:

```bash
# Install Dredd
npm install -g dredd

# Run contract tests
dredd openapi.yaml http://localhost:3000
```

## Customization

### Custom CSS

```typescript
SwaggerModule.setup('api/docs', app, document, {
  customCss: '.swagger-ui .topbar { background-color: #2c3e50; }',
  customSiteTitle: 'ELDERCARE+ API Docs',
});
```

### Custom Logo

```typescript
SwaggerModule.setup('api/docs', app, document, {
  customfavIcon: '/favicon.ico',
  customCss: '.swagger-ui .topbar-wrapper img { content: url("/logo.png"); }',
});
```

## Production Considerations

### Disable in Production

```typescript
if (process.env.ENABLE_SWAGGER === 'true') {
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
```

### Authentication Required

Add authentication guard to Swagger route:

```typescript
app.use('/api/docs', basicAuth({
  users: { 'admin': 'secure_password' },
  challenge: true,
}));
```

## Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Generator](https://openapi-generator.tech/)
