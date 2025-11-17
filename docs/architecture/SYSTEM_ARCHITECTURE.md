# ELDERCARE+ System Architecture

## Executive Summary

ELDERCARE+ is a distributed IoT healthcare platform consisting of edge devices, cloud infrastructure, mobile applications, and ML-powered analytics. The system is designed for 99.9% uptime, HIPAA compliance, and FDA Class II medical device standards.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ELDERCARE+ ECOSYSTEM                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                          EDGE LAYER                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │ Smart Pill      │  │  Fall Detection  │  │  Environmental     │ │
│  │ Dispenser       │  │  Sensor Hub      │  │  Sensors           │ │
│  │                 │  │                  │  │                    │ │
│  │ • ESP32         │  │ • Raspberry Pi 4 │  │ • ESP32            │ │
│  │ • FreeRTOS      │  │ • Coral TPU      │  │ • Temp/Humidity    │ │
│  │ • Motor Control │  │ • mmWave Radar   │  │ • Air Quality      │ │
│  │ • LED/Speaker   │  │ • TF Lite Model  │  │ • Motion PIR       │ │
│  │ • WiFi/LTE      │  │ • Edge ML        │  │ • Door/Window      │ │
│  └────────┬────────┘  └────────┬─────────┘  └──────────┬─────────┘ │
│           │                    │                        │           │
│           └────────────────────┼────────────────────────┘           │
│                                │                                    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │ MQTT over TLS 1.3
                                 │ (Encrypted, Bidirectional)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         CLOUD LAYER (AWS)                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    AWS IoT Core                               │   │
│  │  • Device Registry & Shadows                                 │   │
│  │  • MQTT Broker (Scalable)                                    │   │
│  │  • Rules Engine                                              │   │
│  │  • Certificate-based Authentication                          │   │
│  └─────────────────┬────────────────────────────────────────────┘   │
│                    │                                                 │
│       ┌────────────┼────────────┬──────────────┬─────────────┐      │
│       ▼            ▼            ▼              ▼             ▼      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐  ┌──────────┐ ┌──────────┐ │
│  │ Lambda  │ │  Lambda  │ │  Lambda  │  │   SQS    │ │  Kinesis │ │
│  │ Device  │ │  Alert   │ │   ML     │  │  Queue   │ │  Stream  │ │
│  │ Ingest  │ │ Processor│ │ Inference│  │          │ │          │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘  └────┬─────┘ └────┬─────┘ │
│       │           │            │             │            │        │
│       └───────────┼────────────┴─────────────┼────────────┘        │
│                   │                          │                     │
│              ┌────▼─────────────────────────▼───────┐              │
│              │      Application Backend             │              │
│              │                                       │              │
│              │  NestJS API (Auto-scaling ECS)       │              │
│              │  • REST API                          │              │
│              │  • GraphQL (optional)                │              │
│              │  • WebSocket (real-time)             │              │
│              │  • Authentication (JWT)              │              │
│              │  • Authorization (RBAC)              │              │
│              └──────────┬───────────────────────────┘              │
│                         │                                          │
│              ┌──────────┼───────────────┬──────────────────┐       │
│              ▼          ▼               ▼                  ▼       │
│         ┌─────────┐ ┌─────────┐  ┌──────────┐      ┌───────────┐  │
│         │ RDS     │ │ Time    │  │   S3     │      │  ElastiC  │  │
│         │ Postgre │ │ ScaleDB │  │ (Files,  │      │  Cache    │  │
│         │ SQL     │ │ (Metrics)│ │  Images) │      │  (Redis)  │  │
│         └─────────┘ └─────────┘  └──────────┘      └───────────┘  │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS/WSS (Encrypted)
                               │ CloudFront CDN
┌──────────────────────────────┼──────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├──────────────────────────────┼──────────────────────────────────────┤
│                              │                                       │
│         ┌────────────────────┴─────────────────┐                    │
│         ▼                                      ▼                    │
│  ┌─────────────────┐                  ┌──────────────────┐         │
│  │  Mobile App     │                  │  Web Portal      │         │
│  │  (React Native) │                  │  (React)         │         │
│  │                 │                  │                  │         │
│  │  • iOS/Android  │                  │  • Admin Panel   │         │
│  │  • Family Mode  │                  │  • Provider View │         │
│  │  • Senior Mode  │                  │  • Analytics     │         │
│  │  • Offline Sync │                  │  • Reports       │         │
│  │  • Push Notif   │                  │                  │         │
│  └─────────────────┘                  └──────────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  • Emergency Services (911 API)                                      │
│  • Telemedicine Platform (Twilio Video / Vonage)                     │
│  • EHR Systems (FHIR API)                                            │
│  • Pharmacy Systems (e-Prescribing)                                  │
│  • Medicare/Insurance (Claims API)                                   │
│  • Weather API (for environmental context)                           │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Edge Devices

#### 1.1 Smart Pill Dispenser

**Hardware Specifications:**
- **MCU**: ESP32-WROOM-32D (Dual-core 240MHz, WiFi/BT)
- **Storage**: 4MB Flash, 520KB RAM
- **Connectivity**: WiFi 802.11 b/g/n, LTE Cat-M1 (backup)
- **Motor**: 28 servo motors (one per compartment)
- **Alerts**: RGB LED strip, piezo speaker (85dB)
- **Power**: Li-ion 3000mAh + USB-C charging
- **Battery Life**: 72 hours backup
- **Sensors**: Hall effect (dispense detection), capacitive touch
- **Cost Target**: $45 manufacturing

**Software Stack:**
```cpp
FreeRTOS v10.4.6
├── Task: MQTT Communication (Priority: 3)
├── Task: Motor Control (Priority: 4)
├── Task: Alert Management (Priority: 5)
├── Task: RTC Sync (Priority: 2)
└── Task: OTA Updates (Priority: 1)
```

**Communication Protocol:**
- MQTT v5.0 over TLS 1.3
- QoS Level 1 (at least once delivery)
- Topic structure: `eldercare/{device_id}/{message_type}`
- Heartbeat: Every 60 seconds
- Data format: Protocol Buffers (compact binary)

#### 1.2 Fall Detection Sensor Hub

**Hardware Specifications:**
- **Main Board**: Raspberry Pi 4 Model B (4GB RAM)
- **Edge AI**: Google Coral USB Accelerator
- **Radar**: IWR6843 mmWave sensor (60GHz)
  - Range: 0.5m - 10m
  - Angular resolution: 15° azimuth, 15° elevation
  - Frame rate: 20 FPS
- **Audio**: MEMS microphone (pattern detection only, no recording)
- **Barometric**: BMP388 (fall height estimation)
- **Connectivity**: WiFi 802.11ac, Ethernet
- **Power**: PoE or 15W USB-C
- **Coverage**: 500 sq ft per sensor

**ML Model:**
- **Architecture**: CNN-LSTM Hybrid
  - Input: 20 frames × 64 point cloud features
  - CNN: 3 conv layers (spatial features)
  - LSTM: 2 layers × 128 units (temporal patterns)
  - Output: Fall probability + severity classification
- **Quantization**: INT8 (4x faster inference)
- **Inference Time**: <80ms on Coral TPU
- **Model Size**: 4.2MB (TFLite)

**Fall Detection States:**
```
MONITORING → PRE_FALL → FALL_DETECTED → POST_FALL_ANALYSIS
     ↑          ↓            ↓                  ↓
     ←──────────┴────────────┴──────────────────┘
                   (if false alarm)

FALL_DETECTED triggers:
├── Immediate: High-velocity impact detected
├── Timer: 10 seconds for self-cancel
├── Escalation: 30 seconds → alert family
└── Emergency: 60 seconds → call 911
```

#### 1.3 Environmental Sensors

**Sensor Suite:**
- **Temperature/Humidity**: SHT31-D (±0.2°C, ±2% RH)
- **Air Quality**: BME680 (VOC, CO2 equivalent)
- **Motion**: PIR AM312 (passive infrared)
- **Light**: BH1750 (ambient lux)
- **Door/Window**: Reed switches (magnetic)
- **MCU**: ESP32-C3 (RISC-V, ultra-low power)

**Data Collection:**
- Sampling rate: Every 5 minutes (normal)
- Alert mode: Every 30 seconds (if anomaly)
- Battery life: 12 months (2× AAA)
- Wireless: Zigbee 3.0 / BLE 5.0

#### 1.4 Emergency Button

**Hardware:**
- **Form Factor**: Wearable pendant or wristband
- **Connectivity**: BLE 5.0 to hub, LTE Cat-M1 (direct)
- **GPS**: u-blox NEO-M9N (multi-GNSS)
- **Button**: Large tactile with haptic feedback
- **Alert**: Vibration motor
- **Battery**: CR2032 (6 months) or rechargeable (7 days)
- **Waterproof**: IP67 rated

### 2. Cloud Infrastructure (AWS)

#### 2.1 AWS IoT Core

**Configuration:**
- **Protocol**: MQTT over TLS 1.3, Port 8883
- **Authentication**: X.509 certificates (per device)
- **Authorization**: IoT Policies (least privilege)
- **Device Shadow**: Track online/offline, last state
- **Rules Engine**:
  - Route telemetry → Kinesis Data Streams
  - Route alerts → Lambda → SNS/SQS
  - Route commands → Device shadows

**Message Flow:**
```
Device → IoT Core → Rules Engine → Lambda Functions
                                 ↓
                     ┌────────────┼────────────┐
                     ▼            ▼            ▼
              TimescaleDB    Kinesis      SQS Queue
              (real-time)  (analytics)   (async jobs)
```

**Scaling:**
- Max connections: 500K devices
- Message throughput: 20K messages/second
- Device shadow updates: <100ms latency

#### 2.2 Application Backend (NestJS)

**Architecture Layers:**
```
┌──────────────────────────────────────┐
│     API Layer (Controllers)          │
│  • REST endpoints                    │
│  • GraphQL resolvers (optional)      │
│  • WebSocket gateways                │
└────────────┬─────────────────────────┘
             ▼
┌──────────────────────────────────────┐
│     Service Layer (Business Logic)   │
│  • DeviceService                     │
│  • AlertService                      │
│  • UserService                       │
│  • MedicationService                 │
│  • TelemetryService                  │
└────────────┬─────────────────────────┘
             ▼
┌──────────────────────────────────────┐
│     Data Layer (Repositories)        │
│  • TypeORM entities                  │
│  • TimescaleDB queries               │
│  • Redis caching                     │
└────────────┬─────────────────────────┘
             ▼
┌──────────────────────────────────────┐
│     Infrastructure Layer             │
│  • AWS SDK (IoT, S3, SES)            │
│  • External APIs (Twilio, etc)       │
└──────────────────────────────────────┘
```

**Database Schema (TimescaleDB):**

```sql
-- Hypertable for time-series telemetry
CREATE TABLE device_telemetry (
    time TIMESTAMPTZ NOT NULL,
    device_id UUID NOT NULL,
    metric_type VARCHAR(50),
    value JSONB,
    PRIMARY KEY (time, device_id)
);
SELECT create_hypertable('device_telemetry', 'time');

-- Continuous aggregate for hourly stats
CREATE MATERIALIZED VIEW telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', time) AS bucket,
       device_id,
       metric_type,
       avg((value->>'reading')::float) as avg_value,
       max((value->>'reading')::float) as max_value,
       min((value->>'reading')::float) as min_value
FROM device_telemetry
GROUP BY bucket, device_id, metric_type;

-- Fall detection events
CREATE TABLE fall_events (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    severity VARCHAR(20), -- 'low', 'medium', 'high'
    confidence FLOAT,
    time_on_ground INTEGER, -- seconds
    location JSONB,
    response_time INTEGER, -- seconds to family response
    false_alarm BOOLEAN DEFAULT false,
    notes TEXT
);
CREATE INDEX idx_fall_events_time ON fall_events (timestamp DESC);
CREATE INDEX idx_fall_events_device ON fall_events (device_id);

-- Medication adherence
CREATE TABLE medication_events (
    id UUID PRIMARY KEY,
    dispenser_id UUID NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    actual_time TIMESTAMPTZ,
    medication_name VARCHAR(255),
    compartment INTEGER,
    taken BOOLEAN,
    missed BOOLEAN,
    late_minutes INTEGER
);
```

**API Endpoints:**

```typescript
// Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

// Devices
GET    /api/v1/devices
GET    /api/v1/devices/:id
POST   /api/v1/devices/:id/command
GET    /api/v1/devices/:id/telemetry
GET    /api/v1/devices/:id/status

// Alerts
GET    /api/v1/alerts
GET    /api/v1/alerts/:id
PUT    /api/v1/alerts/:id/acknowledge
POST   /api/v1/alerts/:id/escalate

// Medication
GET    /api/v1/medication/schedule/:userId
POST   /api/v1/medication/schedule
PUT    /api/v1/medication/schedule/:id
GET    /api/v1/medication/adherence/:userId

// Fall Detection
GET    /api/v1/falls/:userId
GET    /api/v1/falls/:id
PUT    /api/v1/falls/:id/mark-false-alarm

// Family Coordination
GET    /api/v1/family/:familyId/members
POST   /api/v1/family/:familyId/invite
GET    /api/v1/family/:familyId/calendar
POST   /api/v1/family/:familyId/tasks
PUT    /api/v1/family/tasks/:id/assign

// Telemedicine
POST   /api/v1/telemedicine/appointments
GET    /api/v1/telemedicine/appointments/:id
POST   /api/v1/telemedicine/:id/start-session
POST   /api/v1/telemedicine/:id/end-session

// Analytics
GET    /api/v1/analytics/dashboard/:userId
GET    /api/v1/analytics/medication-adherence
GET    /api/v1/analytics/activity-patterns
GET    /api/v1/analytics/environmental-trends
```

**Real-time Communication:**
```typescript
// WebSocket events (Socket.io)
namespace: /eldercare

// Client → Server
'subscribe_elder' : { elderId: string }
'unsubscribe_elder' : { elderId: string }

// Server → Client
'telemetry_update' : { deviceId, metric, value, timestamp }
'alert_created' : { alertId, type, severity, message }
'fall_detected' : { eventId, severity, location, timestamp }
'medication_taken' : { scheduleId, time }
'device_status_change' : { deviceId, status }
```

#### 2.3 Deployment (ECS Fargate)

```yaml
# Auto-scaling configuration
Service: eldercare-api
  DesiredCount: 2
  MinimumHealthyPercent: 100
  MaximumPercent: 200

  AutoScaling:
    MinCapacity: 2
    MaxCapacity: 20
    TargetCPUUtilization: 70%
    TargetMemoryUtilization: 80%
    ScaleOutCooldown: 60s
    ScaleInCooldown: 300s

  HealthCheck:
    Path: /health
    Interval: 30s
    Timeout: 5s
    HealthyThreshold: 2
    UnhealthyThreshold: 3

  Resources:
    CPU: 1024 (1 vCPU)
    Memory: 2048 MB
```

### 3. Mobile Application (React Native)

**Architecture:**
```
src/
├── components/          # Reusable UI components
│   ├── common/         # Buttons, inputs, cards
│   ├── dashboard/      # Dashboard widgets
│   ├── medication/     # Pill schedule UI
│   └── alerts/         # Alert notifications
├── screens/            # App screens
│   ├── auth/
│   ├── dashboard/
│   ├── family/
│   ├── medication/
│   ├── telemedicine/
│   └── settings/
├── navigation/         # React Navigation setup
├── store/             # Redux store
│   ├── slices/        # Redux Toolkit slices
│   ├── api/           # RTK Query API
│   └── middleware/    # Custom middleware
├── services/          # Business logic
│   ├── api/           # API client
│   ├── websocket/     # Socket.io client
│   ├── notifications/ # Push notifications
│   └── location/      # GPS tracking
├── hooks/             # Custom React hooks
├── utils/             # Utilities
└── types/             # TypeScript types
```

**Key Features Implementation:**

**Dashboard (Real-time):**
```typescript
// Real-time telemetry updates
const Dashboard = ({ elderId }: Props) => {
  const [telemetry, setTelemetry] = useState<Telemetry>({});
  const socket = useSocket();

  useEffect(() => {
    socket.emit('subscribe_elder', { elderId });

    socket.on('telemetry_update', (data) => {
      setTelemetry(prev => ({
        ...prev,
        [data.metric]: data.value
      }));
    });

    socket.on('alert_created', (alert) => {
      showNotification(alert);
      playAlertSound(alert.severity);
    });

    return () => socket.emit('unsubscribe_elder', { elderId });
  }, [elderId]);

  return (
    <View>
      <StatusCard status={telemetry.status} />
      <MedicationWidget adherence={telemetry.medication} />
      <ActivityChart data={telemetry.activity} />
      <EnvironmentalStats env={telemetry.environment} />
    </View>
  );
};
```

**Offline Support:**
```typescript
// Redux persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user', 'family', 'medication', 'offlineQueue'],
  transforms: [
    // Encrypt sensitive data
    createEncryptTransform({
      secretKey: await getEncryptionKey(),
    })
  ]
};

// Offline queue middleware
const offlineMiddleware: Middleware = store => next => action => {
  if (!isOnline && isApiAction(action)) {
    store.dispatch(queueAction(action));
    return;
  }
  return next(action);
};

// Sync when online
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    store.dispatch(processOfflineQueue());
  }
});
```

**Accessibility (WCAG 2.1 AA):**
```typescript
// Senior-friendly mode
const SeniorMode = {
  fontSize: {
    small: 20,
    medium: 24,
    large: 32,
    xlarge: 40
  },
  contrast: 'high', // WCAG AAA 7:1 ratio
  touchTargets: 60, // 60dp minimum (WCAG 44px)
  animations: 'reduced',
  voiceAssistance: true
};

// Voice commands (React Native Voice)
const useVoiceCommands = () => {
  Voice.onSpeechResults = (e) => {
    const command = e.value[0].toLowerCase();

    if (command.includes('medication')) {
      navigation.navigate('Medication');
    } else if (command.includes('help') || command.includes('emergency')) {
      triggerEmergencyCall();
    } else if (command.includes('call family')) {
      callPrimaryContact();
    }
  };
};
```

### 4. Machine Learning Pipeline

#### Training Pipeline (PyTorch)

```python
# Model architecture
class FallDetectionModel(nn.Module):
    def __init__(self):
        super().__init__()

        # CNN for spatial features (point cloud)
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)

        # LSTM for temporal patterns
        self.lstm = nn.LSTM(
            input_size=128,
            hidden_size=128,
            num_layers=2,
            batch_first=True,
            dropout=0.3
        )

        # Classification head
        self.fc1 = nn.Linear(128, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc_fall = nn.Linear(32, 2)  # Fall / No Fall
        self.fc_severity = nn.Linear(32, 3)  # Low / Medium / High

    def forward(self, x):
        # x shape: (batch, sequence_len, channels, height, width)
        batch_size, seq_len, c, h, w = x.size()

        # Process each frame through CNN
        cnn_out = []
        for t in range(seq_len):
            frame = x[:, t, :, :, :]
            features = self.pool(F.relu(self.conv1(frame)))
            features = self.pool(F.relu(self.conv2(features)))
            features = self.pool(F.relu(self.conv3(features)))
            features = features.mean(dim=[2, 3])  # Global average pooling
            cnn_out.append(features)

        # Stack temporal features
        lstm_input = torch.stack(cnn_out, dim=1)

        # LSTM temporal modeling
        lstm_out, _ = self.lstm(lstm_input)
        final_state = lstm_out[:, -1, :]

        # Classification
        x = F.relu(self.fc1(final_state))
        x = F.relu(self.fc2(x))

        fall_prob = self.fc_fall(x)
        severity = self.fc_severity(x)

        return fall_prob, severity
```

#### Synthetic Data Generation

```python
# Generate realistic fall patterns
class SyntheticFallGenerator:
    """
    Generates synthetic radar point clouds for fall detection training
    """

    def generate_fall_sequence(self, fall_type='forward'):
        """
        fall_type: 'forward', 'backward', 'sideways', 'syncope' (fainting)
        """
        sequence = []

        # Pre-fall (standing, 60 frames @ 20fps = 3 seconds)
        for t in range(60):
            points = self.generate_standing_posture(
                height=1.7,  # meters
                noise_level=0.02
            )
            sequence.append(points)

        # Fall transition (20 frames = 1 second)
        if fall_type == 'forward':
            trajectory = self.forward_fall_trajectory()
        elif fall_type == 'backward':
            trajectory = self.backward_fall_trajectory()
        elif fall_type == 'sideways':
            trajectory = self.sideways_fall_trajectory()
        else:  # syncope
            trajectory = self.syncope_trajectory()

        for t, pose in enumerate(trajectory):
            points = self.generate_falling_posture(pose)
            sequence.append(points)

        # Post-fall (on ground, 40 frames = 2 seconds)
        for t in range(40):
            points = self.generate_ground_posture(
                movement=random.choice([True, False])  # struggling or still
            )
            sequence.append(points)

        return np.array(sequence)

    def generate_standing_posture(self, height, noise_level):
        # Simplified human model as point cloud
        points = []

        # Head
        points.append([0, 0, height])

        # Torso
        for z in np.linspace(height-0.6, height-0.1, 5):
            points.append([0, 0, z])

        # Arms
        for x in [-0.2, 0.2]:
            for z in np.linspace(height-0.5, height-0.9, 3):
                points.append([x, 0, z])

        # Legs
        for x in [-0.1, 0.1]:
            for z in np.linspace(0, height-0.6, 4):
                points.append([x, 0, z])

        # Add radar noise
        points = np.array(points)
        points += np.random.normal(0, noise_level, points.shape)

        # Add micro-movements (breathing, swaying)
        points[:, :2] += np.random.normal(0, 0.01, (points.shape[0], 2))

        return points
```

#### Edge Deployment (TensorFlow Lite)

```python
# Convert PyTorch → ONNX → TensorFlow → TFLite
def convert_to_tflite(pytorch_model, quantize=True):
    # Export to ONNX
    dummy_input = torch.randn(1, 20, 1, 64, 64)
    torch.onnx.export(
        pytorch_model,
        dummy_input,
        "fall_detection.onnx",
        opset_version=11
    )

    # ONNX → TensorFlow
    import onnx
    from onnx_tf.backend import prepare

    onnx_model = onnx.load("fall_detection.onnx")
    tf_model = prepare(onnx_model)
    tf_model.export_graph("fall_detection_tf")

    # TensorFlow → TFLite
    converter = tf.lite.TFLiteConverter.from_saved_model("fall_detection_tf")

    if quantize:
        # INT8 quantization (4x smaller, 4x faster on Edge TPU)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.int8]

        # Representative dataset for calibration
        def representative_dataset():
            for _ in range(100):
                yield [np.random.randn(1, 20, 1, 64, 64).astype(np.float32)]

        converter.representative_dataset = representative_dataset

    tflite_model = converter.convert()

    # Save quantized model
    with open('fall_detection_quantized.tflite', 'wb') as f:
        f.write(tflite_model)

    # Compile for Edge TPU
    # edgetpu_compiler fall_detection_quantized.tflite

    return tflite_model
```

#### Edge Inference (Python on Raspberry Pi)

```python
# Fall detection inference loop
class FallDetector:
    def __init__(self, model_path, use_coral=True):
        if use_coral:
            from pycoral.utils import edgetpu
            from pycoral.adapters import common

            self.interpreter = edgetpu.make_interpreter(model_path)
        else:
            self.interpreter = tf.lite.Interpreter(model_path)

        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

        # Circular buffer for temporal window
        self.frame_buffer = deque(maxlen=20)  # 20 frames @ 20fps = 1 second

        # State machine
        self.state = 'MONITORING'
        self.fall_start_time = None
        self.time_on_ground = 0

    def process_radar_frame(self, point_cloud):
        """
        point_cloud: (N, 3) array of [x, y, z] points from mmWave radar
        """
        # Preprocess
        processed = self.preprocess_points(point_cloud)
        self.frame_buffer.append(processed)

        if len(self.frame_buffer) < 20:
            return None  # Not enough frames yet

        # Prepare input tensor
        input_data = np.array(list(self.frame_buffer))
        input_data = np.expand_dims(input_data, axis=0).astype(np.float32)

        # Inference
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)

        start = time.time()
        self.interpreter.invoke()
        inference_time = time.time() - start

        # Get outputs
        fall_prob = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
        severity = self.interpreter.get_tensor(self.output_details[1]['index'])[0]

        # Interpret results
        is_fall = fall_prob[1] > 0.85  # 85% confidence threshold
        severity_level = ['low', 'medium', 'high'][np.argmax(severity)]

        # State machine logic
        event = self.update_state(is_fall, severity_level)

        return {
            'is_fall': is_fall,
            'confidence': float(fall_prob[1]),
            'severity': severity_level,
            'inference_time_ms': inference_time * 1000,
            'event': event
        }

    def update_state(self, is_fall, severity):
        """
        State machine for fall detection with false alarm reduction
        """
        now = time.time()

        if self.state == 'MONITORING':
            if is_fall:
                self.state = 'PRE_FALL'
                self.fall_start_time = now
                return None  # Don't alert yet

        elif self.state == 'PRE_FALL':
            if now - self.fall_start_time > 0.5:  # Confirmed over 500ms
                self.state = 'FALL_DETECTED'
                return {
                    'type': 'fall_detected',
                    'severity': severity,
                    'timestamp': now,
                    'alert_family': True,
                    'escalate_timer': 30  # seconds
                }
            elif not is_fall:
                self.state = 'MONITORING'  # False alarm

        elif self.state == 'FALL_DETECTED':
            self.time_on_ground += 0.05  # 20fps = 50ms per frame

            if self.time_on_ground > 60:  # 60 seconds on ground
                return {
                    'type': 'emergency_escalation',
                    'call_911': True,
                    'time_on_ground': self.time_on_ground
                }

        return None

    def preprocess_points(self, points):
        """
        Convert 3D point cloud to 2D grid representation
        """
        # Create 64x64 occupancy grid
        grid = np.zeros((64, 64), dtype=np.float32)

        # Bin points into grid cells
        for point in points:
            x, y, z = point

            # Convert to grid coordinates (-5m to 5m → 0 to 63)
            grid_x = int((x + 5) / 10 * 63)
            grid_y = int((y + 5) / 10 * 63)

            if 0 <= grid_x < 64 and 0 <= grid_y < 64:
                grid[grid_y, grid_x] = max(grid[grid_y, grid_x], z)  # Height

        return grid
```

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Device Security                                   │
│  • Secure boot (signed firmware)                            │
│  • Hardware crypto module (ATECC608)                        │
│  • Unique X.509 certificates per device                     │
│  • Encrypted storage (AES-256)                              │
│  • OTA with signature verification                          │
│                                                              │
│  Layer 2: Network Security                                  │
│  • TLS 1.3 for all communications                           │
│  • Certificate pinning                                      │
│  • VPN option for healthcare providers                      │
│  • DDoS protection (AWS Shield)                             │
│                                                              │
│  Layer 3: Application Security                              │
│  • JWT with short expiration (15 min access, 7 day refresh) │
│  • Role-based access control (RBAC)                         │
│  • Multi-factor authentication (MFA)                        │
│  • Rate limiting (API Gateway)                              │
│  • SQL injection prevention (parameterized queries)         │
│  • XSS protection (Content Security Policy)                 │
│                                                              │
│  Layer 4: Data Security                                     │
│  • Encryption at rest (AES-256)                             │
│  • Encryption in transit (TLS 1.3)                          │
│  • Database encryption (RDS)                                │
│  • S3 bucket encryption                                     │
│  • PHI segregation (separate tables)                        │
│  • Data retention policies                                  │
│                                                              │
│  Layer 5: Monitoring & Response                             │
│  • CloudWatch logs (all API calls)                          │
│  • AWS GuardDuty (threat detection)                         │
│  • Security Hub (compliance scanning)                       │
│  • Intrusion detection (IDS)                                │
│  • Automated incident response                              │
│  • Security audits (quarterly)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### HIPAA Compliance

**Technical Safeguards:**
1. Access Control (§164.312(a))
   - Unique user IDs
   - Emergency access procedure
   - Automatic logoff (15 minutes idle)
   - Encryption of PHI

2. Audit Controls (§164.312(b))
   - All access logged (CloudWatch)
   - Tamper-proof logs (immutable S3)
   - Quarterly audit reviews
   - Breach detection alerts

3. Integrity (§164.312(c))
   - Checksums for data transmission
   - Digital signatures
   - Version control

4. Person/Entity Authentication (§164.312(d))
   - Multi-factor authentication
   - Certificate-based device auth
   - Biometric options (Touch ID / Face ID)

5. Transmission Security (§164.312(e))
   - TLS 1.3 encryption
   - VPN for provider access
   - Encrypted backups

## Performance Requirements

### Latency

| Component | Requirement | Target |
|-----------|-------------|--------|
| Fall detection inference | <100ms | 80ms |
| Alert to family (push) | <5s | 2s |
| Medication reminder delivery | <10s | 5s |
| API response time (p95) | <200ms | 150ms |
| WebSocket message delivery | <1s | 500ms |
| Device heartbeat interval | 60s | 60s |

### Throughput

| Metric | Requirement |
|--------|-------------|
| Devices supported | 500,000 |
| Messages/second | 20,000 |
| Concurrent API users | 50,000 |
| Telemetry points/day | 50M |
| Video calls concurrent | 1,000 |

### Availability

| Service | SLA |
|---------|-----|
| Overall platform | 99.9% (8.76h downtime/year) |
| Fall detection | 99.95% |
| Emergency alerts | 99.99% |
| API | 99.9% |
| Mobile app | 99.5% |

## Disaster Recovery

**RTO (Recovery Time Objective)**: 1 hour
**RPO (Recovery Point Objective)**: 5 minutes

**Backup Strategy:**
- Database: Continuous replication (Multi-AZ RDS)
- TimescaleDB: Point-in-time recovery (PITR)
- S3: Cross-region replication
- Config: Infrastructure as Code (Terraform)

**Failover:**
- Primary region: us-east-1
- DR region: us-west-2
- Automated failover for critical services
- Manual failover for non-critical (with runbook)

## Monitoring & Observability

**Metrics:**
```
Business Metrics:
├── Active devices (by type)
├── Medication adherence rate
├── Fall detection accuracy
├── False alarm rate
├── Average response time to alerts
├── Telemedicine appointments completed
└── Family engagement score

Technical Metrics:
├── API latency (p50, p95, p99)
├── Error rates (4xx, 5xx)
├── Device connectivity (online/offline)
├── MQTT message throughput
├── Database query performance
├── Lambda execution duration
├── Mobile app crash rate
└── Battery life (devices)

Security Metrics:
├── Failed authentication attempts
├── Suspicious IP addresses
├── DDoS attack attempts
├── Certificate expiration warnings
└── Audit log completeness
```

**Alerting:**
```yaml
Critical Alerts (PagerDuty):
  - Fall detected with no family response (>2 min)
  - Device offline >10 minutes
  - API error rate >5%
  - Database connection failures
  - Security breach detected

Warning Alerts (Email/Slack):
  - Medication missed
  - Battery low (<20%)
  - High API latency (>500ms)
  - Device firmware outdated
  - Certificate expiring (<30 days)

Info Alerts (Dashboard):
  - Daily summary reports
  - Weekly adherence trends
  - Monthly analytics
```

## Scalability Plan

**Phase 1: Launch (1K-10K devices)**
- Single AWS region
- RDS PostgreSQL (db.r5.xlarge)
- 2-4 ECS tasks
- Basic autoscaling

**Phase 2: Growth (10K-100K devices)**
- Multi-AZ deployment
- TimescaleDB cluster (3 nodes)
- 10-20 ECS tasks
- CloudFront CDN
- Read replicas

**Phase 3: Scale (100K-500K devices)**
- Multi-region (us-east-1, us-west-2)
- Aurora PostgreSQL Serverless
- TimescaleDB sharding by device_id
- 50+ ECS tasks with spot instances
- ElastiCache Redis cluster
- Database connection pooling (PgBouncer)

## Conclusion

ELDERCARE+ is architected for reliability, security, and scalability. The system leverages proven technologies (AWS, NestJS, React Native) with healthcare-specific requirements (HIPAA, FDA) at its core. The modular design allows for iterative development and deployment while maintaining strict quality standards.

---

**Next Steps:**
1. Review hardware/firmware specifications
2. Set up cloud infrastructure (Terraform)
3. Develop MVP backend API
4. Build mobile app prototype
5. Train initial ML models
6. Begin FDA pre-submission process
