# Smart Pill Dispenser - Technical Specifications

## Product Overview

The ELDERCARE+ Smart Pill Dispenser is a 28-day programmable medication management device with automatic dispensing, multi-modal alerts, and cloud connectivity. Target manufacturing cost: <$50 at 10K unit volume.

## Hardware Specifications

### Main Components

#### 1. Microcontroller Unit (MCU)
- **Model**: Espressif ESP32-WROOM-32D
- **Processor**: Xtensa dual-core 32-bit LX6, up to 240 MHz
- **Memory**:
  - 520 KB SRAM
  - 448 KB ROM
  - 4 MB external SPI flash
- **Connectivity**:
  - WiFi 802.11 b/g/n (2.4 GHz)
  - Bluetooth v4.2 BR/EDR and BLE
- **Peripherals**:
  - 34× GPIO
  - 16× PWM channels
  - 2× I²C
  - 4× SPI
  - 2× UART
  - 18× 12-bit ADC
- **Cost**: $2.50 @ 10K units
- **Power**: 80mA active, 10µA deep sleep

#### 2. Cellular Modem (Backup Connectivity)
- **Model**: Quectel BG96 LTE Cat M1/NB-IoT
- **Features**:
  - LTE Cat M1 (eMTC) fallback
  - NB-IoT (NB1/NB2)
  - Integrated GNSS (optional)
  - SIM card slot (nano SIM)
- **Power**: 100mA average, <2mA idle
- **Cost**: $8.00 @ 10K units
- **Use Case**: Primary WiFi failure backup

#### 3. Dispensing Mechanism

##### Carousel System
- **Design**: Rotating carousel with 28 compartments (4 weeks)
- **Motor**: 28BYJ-48 5V stepper motor with ULN2003 driver
  - Steps per revolution: 2048 (64 steps × 32 gear ratio)
  - Steps per compartment: 73 steps (2048/28)
  - Torque: 34 N·cm
  - Cost: $0.80 per motor+driver
- **Position Sensor**: AS5600 magnetic rotary encoder
  - 12-bit resolution (4096 positions)
  - I²C interface
  - Cost: $1.20
- **Dispensing Gate**: Servo-controlled flap (SG90 micro servo)
  - Cost: $1.50

##### Compartment Design
- **Size**: 40mm diameter × 25mm depth (≈31 mL volume)
- **Capacity**: Up to 15 standard pills or 30 small tablets
- **Material**: Food-grade polypropylene (PP)
- **Lid**: Clear polycarbonate for visual verification
- **Seal**: Silicone gasket (moisture protection)

#### 4. User Interface

##### Visual Alerts
- **LED Ring**: WS2812B addressable RGB LEDs (28 LEDs, one per compartment)
  - Individual color control
  - Animation support
  - Cost: $2.50
- **Display**: 0.96" OLED (SSD1306, 128×64px, I²C)
  - Shows current time, next dose, WiFi status
  - Cost: $2.00

##### Audio Alerts
- **Buzzer**: Piezo buzzer 85dB @ 10cm
  - Multiple tone patterns
  - Adjustable volume
  - Cost: $0.40

##### Physical Controls
- **Main Button**: Large tactile dome button (30mm)
  - "Acknowledge" or "I took my medication"
  - Cost: $1.20
- **Configuration Button**: Small reset/pairing button
  - Cost: $0.20

#### 5. Sensors

##### Dispense Detection
- **Pill Removed Sensor**: IR break-beam detector
  - Transmitter: 940nm IR LED
  - Receiver: phototransistor
  - Detects pills removed from tray
  - Cost: $0.60

##### Environmental
- **Temperature/Humidity**: SHT31-D (I²C)
  - Temperature: ±0.2°C accuracy
  - Humidity: ±2% RH accuracy
  - Monitor storage conditions
  - Cost: $1.80

##### Tampering Detection
- **Lid Open Sensor**: Reed switch + magnet
  - Detect unauthorized access
  - Cost: $0.30

#### 6. Power System

##### Battery
- **Type**: Rechargeable Li-ion 18650
- **Capacity**: 3000 mAh @ 3.7V (11.1 Wh)
- **Quantity**: 1 cell
- **Protection**: BMS (Battery Management System)
  - Overcharge protection
  - Overdischarge protection
  - Short circuit protection
  - Cost: $3.50 (battery + BMS)

##### Charging
- **Port**: USB-C (USB 2.0 for power)
- **IC**: TP4056 charging controller
  - 1A max charge current
  - LED charge indicators
  - Cost: $0.40
- **Wall Adapter**: 5V/2A USB-C (included)
  - Cost: $2.00

##### Power Management
- **Regulator**: AMS1117-3.3V (3.3V rail for MCU)
- **Battery Life**:
  - **Standby**: 30 days (WiFi periodic check-ins)
  - **Active**: 3-4 days (frequent alerts, motor use)
  - **Backup Mode**: 72 hours minimum (power outage)

#### 7. Security

##### Crypto Module
- **IC**: Microchip ATECC608A
- **Features**:
  - Hardware AES-128/256 encryption
  - ECDSA P-256 signature generation
  - Secure key storage (16 keys)
  - Hardware RNG
  - SHA-256 hashing
- **Use Case**: Device authentication, certificate storage
- **Cost**: $0.65

#### 8. Real-Time Clock (RTC)
- **IC**: DS3231 (I²C)
- **Accuracy**: ±2ppm (±1 minute/year)
- **Battery Backup**: CR2032 coin cell (5+ years)
- **Features**:
  - Temperature-compensated crystal
  - Alarm functions
  - Square wave output
- **Cost**: $1.50 (IC + battery)

### Enclosure

#### Mechanical Design
- **Dimensions**: 180mm (W) × 180mm (D) × 120mm (H)
- **Material**: ABS plastic (injection molded)
  - UV stabilized
  - Matte finish
  - Available colors: White, beige, light blue
- **Weight**: 650g (without pills)
- **Mounting**: Non-slip rubber feet, optional wall mount

#### Tooling & Manufacturing
- **Mold Cost**: $15,000 (multi-cavity mold)
- **Cycle Time**: 45 seconds
- **Material Cost**: $3.50 per unit @ 10K
- **Assembly**: Semi-automated (15 minutes per unit)

### Environmental Ratings
- **Operating Temperature**: 10°C to 40°C
- **Storage Temperature**: -10°C to 50°C
- **Humidity**: 10% to 80% RH (non-condensing)
- **Ingress Protection**: IP42 (indoor use, splash-resistant)

## Bill of Materials (BOM)

| Component | Part Number | Qty | Unit Cost | Extended |
|-----------|-------------|-----|-----------|----------|
| **Electronics** | | | | |
| ESP32-WROOM-32D | ESP32-WROOM-32D | 1 | $2.50 | $2.50 |
| Quectel BG96 LTE | BG96MA-128-SGN | 1 | $8.00 | $8.00 |
| ATECC608A Crypto | ATECC608A-MAHDA-T | 1 | $0.65 | $0.65 |
| DS3231 RTC | DS3231SN# | 1 | $1.50 | $1.50 |
| SHT31-D Sensor | SHT31-DIS-B | 1 | $1.80 | $1.80 |
| AS5600 Encoder | AS5600-ASOM | 1 | $1.20 | $1.20 |
| OLED Display | SSD1306 0.96" | 1 | $2.00 | $2.00 |
| WS2812B LED Ring | WS2812B-28 | 1 | $2.50 | $2.50 |
| **Motors & Actuators** | | | | |
| Stepper Motor | 28BYJ-48 | 1 | $0.80 | $0.80 |
| Servo Motor | SG90 | 1 | $1.50 | $1.50 |
| **Power** | | | | |
| 18650 Li-ion | NCR18650B 3000mAh | 1 | $3.50 | $3.50 |
| TP4056 Charger | TP4056 Module | 1 | $0.40 | $0.40 |
| USB-C Connector | USB-C-16P-SMD | 1 | $0.30 | $0.30 |
| AMS1117 Regulator | AMS1117-3.3 | 1 | $0.15 | $0.15 |
| **Sensors** | | | | |
| IR LED/Detector | LTE-4208/LTR-4206E | 1 | $0.60 | $0.60 |
| Reed Switch | CT10-XXX5-G1 | 1 | $0.30 | $0.30 |
| **UI Components** | | | | |
| Piezo Buzzer | PKM13EPYH4002-B0 | 1 | $0.40 | $0.40 |
| Dome Button 30mm | B3F-4055 | 1 | $1.20 | $1.20 |
| Reset Button | B3F-1000 | 1 | $0.20 | $0.20 |
| **Mechanical** | | | | |
| Enclosure (ABS) | Custom Molded | 1 | $3.50 | $3.50 |
| Carousel Tray | PP Injection Mold | 1 | $2.00 | $2.00 |
| Gears & Hardware | Various | 1 | $1.50 | $1.50 |
| **Misc** | | | | |
| PCB (4-layer) | Custom | 1 | $4.00 | $4.00 |
| Resistors/Caps | Various | - | $1.00 | $1.00 |
| Connectors | Various | - | $0.80 | $0.80 |
| Screws/Fasteners | M3 screws | - | $0.50 | $0.50 |
| **Packaging** | | | | |
| Box + Manual | Custom Print | 1 | $1.50 | $1.50 |
| USB-C Cable | 1m Cable | 1 | $0.80 | $0.80 |
| Wall Adapter | 5V/2A | 1 | $2.00 | $2.00 |
| **TOTAL** | | | | **$52.30** |

**Note**: Costs at 10K unit volume. Target achieved with optimization: $48-50 at scale.

## Firmware Architecture

See `/hardware/firmware/pill-dispenser/` for complete source code.

### Key Features
- **FreeRTOS**: Multi-task scheduling
- **MQTT Client**: Secure cloud communication
- **Scheduler**: Precise medication timing (RTC-based)
- **OTA Updates**: Secure firmware updates
- **Power Management**: Deep sleep between events
- **Watchdog**: Auto-recovery from crashes

### Task Priorities
```
Priority 5 (Highest):  MotorControl_Task
Priority 4:            AlertManagement_Task
Priority 3:            MQTT_Communication_Task
Priority 2:            RTC_Sync_Task
Priority 1:            OTA_Update_Task
Priority 0 (Idle):     Power_Management_Task
```

## Communication Protocol

### MQTT Topics

**Device → Cloud (Publish)**
```
eldercare/{device_id}/telemetry
eldercare/{device_id}/events/dispense
eldercare/{device_id}/events/missed
eldercare/{device_id}/events/alert_ack
eldercare/{device_id}/status
```

**Cloud → Device (Subscribe)**
```
eldercare/{device_id}/commands/schedule
eldercare/{device_id}/commands/dispense_now
eldercare/{device_id}/commands/update_firmware
eldercare/{device_id}/commands/config
```

### Message Format (Protocol Buffers)

```protobuf
message TelemetryMessage {
  string device_id = 1;
  int64 timestamp = 2;

  message Environment {
    float temperature = 1;  // Celsius
    float humidity = 2;     // % RH
  }

  message Power {
    float battery_voltage = 1;  // Volts
    int32 battery_percent = 2;  // 0-100
    bool charging = 3;
  }

  Environment environment = 3;
  Power power = 4;
  bool lid_open = 5;
  string firmware_version = 6;
}

message DispenseEvent {
  string device_id = 1;
  int64 scheduled_time = 2;
  int64 actual_time = 3;
  int32 compartment = 4;
  string medication_name = 5;
  bool pill_removed = 6;
  int32 alert_duration = 7;  // seconds until acknowledged
}

message MissedDoseEvent {
  string device_id = 1;
  int64 scheduled_time = 2;
  int32 compartment = 3;
  string medication_name = 4;
  int32 minutes_overdue = 5;
}
```

## Manufacturing Process

### Assembly Steps

1. **PCB Assembly** (SMT + Through-hole)
   - Automated pick-and-place
   - Reflow soldering
   - Manual insertion of through-hole components
   - Wave soldering
   - Time: 5 minutes

2. **Functional Test**
   - Power-on test
   - WiFi connectivity test
   - Motor calibration
   - Sensor verification
   - Certificate provisioning (ATECC608A)
   - Time: 3 minutes

3. **Mechanical Assembly**
   - Install PCB in enclosure
   - Mount carousel mechanism
   - Attach LED ring
   - Install display and buttons
   - Time: 5 minutes

4. **Final Assembly**
   - Close enclosure (screws)
   - Apply labels
   - Insert battery
   - Time: 2 minutes

5. **QA Testing**
   - Full dispense cycle test
   - Alert verification
   - Cloud connectivity test
   - Firmware version check
   - Time: 5 minutes

**Total Assembly Time**: 20 minutes per unit

### Quality Control

- **Incoming QC**: Component inspection (AQL 1.5)
- **In-Process QC**: PCB inspection (AOI + X-ray for BGA)
- **Final QC**: 100% functional test
- **Burn-In**: 24-hour stress test (random 10% sample)
- **Packaging QC**: Weight check, visual inspection

### Yield Targets
- **PCB Assembly**: 98% first-pass yield
- **Final Assembly**: 99% pass rate
- **RMA Rate**: <2% in first year

## Compliance & Certifications

### Required Certifications

#### FCC (USA)
- **Part 15, Subpart B**: Unintentional radiators (digital device)
- **Part 15, Subpart C**: Intentional radiators (WiFi, BT, LTE)
- **Testing**: Radiated emissions, conducted emissions
- **Cost**: $8,000-$12,000
- **Timeline**: 6-8 weeks

#### CE (Europe)
- **EMC Directive**: 2014/30/EU
- **RED Directive**: 2014/53/EU (radio equipment)
- **RoHS**: 2011/65/EU (hazardous substances)
- **Testing**: Similar to FCC
- **Cost**: $10,000-$15,000
- **Timeline**: 8-10 weeks

#### IC (Canada)
- **RSS-210**: Radio equipment
- **ICES-003**: Digital apparatus
- **Cost**: $3,000-$5,000 (if FCC done)

#### UL/Safety
- **UL 60950-1**: IT equipment safety
- **Battery Safety**: UL 1642 (Li-ion cells)
- **Cost**: $15,000-$20,000
- **Timeline**: 10-12 weeks

#### FDA (Medical Device)
- **Classification**: Class II (if making medical claims)
- **510(k) Clearance**: If classified as medical device
- **OR Consumer Product**: If marketed as reminder device only
- **Strategy**: Initial launch as "medication reminder" (non-medical) to avoid 510(k)

### Regulatory Strategy

**Phase 1**: Launch as consumer wellness product
- Market as "medication reminder and organizer"
- Avoid disease claims
- No FDA clearance required
- Can advertise and sell directly

**Phase 2**: Pursue FDA clearance (Year 2)
- Conduct clinical studies
- File 510(k) with predicate device
- Claim improved medication adherence
- Qualify for Medicare reimbursement

## User Manual (Quick Start)

### Setup
1. **Charge Device**: Plug in USB-C cable, wait for green LED
2. **Download App**: iOS or Android "ELDERCARE+" app
3. **Create Account**: Sign up with email
4. **Pair Device**: Scan QR code on bottom of dispenser
5. **Connect WiFi**: Follow in-app instructions
6. **Load Medications**:
   - Open lid
   - Fill compartments clockwise starting from "Day 1 AM"
   - Close lid (device auto-detects)
7. **Set Schedule**: Use app to program medication times
8. **Test**: Trigger manual dispense from app

### Daily Use
- **Medication Time**: Device lights up, beeps, and rotates to correct compartment
- **Take Pills**: Remove pills from tray, press dome button to acknowledge
- **Missed Dose**: Family receives alert if not taken within 30 minutes
- **Refill**: App notifies when running low (3 days remaining)

### Troubleshooting
- **Not Dispensing**: Check battery, restart device
- **WiFi Issues**: Re-pair in app, check router
- **Incorrect Time**: Device auto-syncs via NTP; check internet
- **Alert Not Working**: Check volume in app settings

## Cost Optimization Opportunities

To reach <$50 target:

1. **Remove LTE Module** (-$8.00)
   - Rely solely on WiFi
   - Or offer as $10 add-on "Premium Connectivity"

2. **Simplify LED Ring** (-$1.50)
   - Use single RGB LED instead of 28
   - Or simple status LED (red/yellow/green)

3. **Reduce Compartments** (-$1.00)
   - 14-day version (2 weeks) for lower tier
   - Simpler carousel mechanism

4. **Plastic Display Window** (-$1.00)
   - Remove OLED, use app for all info
   - LED status indicators only

**With optimizations**: $52.30 - $11.50 = **$40.80** ✓

Recommendation: Launch with full-feature version at $299 retail (6x margin), introduce budget version later.

## Roadmap

### Version 1.0 (Launch)
- 28-day capacity
- WiFi connectivity
- Basic alerts (LED, sound)
- Mobile app control

### Version 1.5 (6 months)
- Optional LTE add-on
- Voice reminders (speaker)
- Improved battery life (5 days)

### Version 2.0 (12 months)
- Automatic pill counting (weight sensors)
- Photo verification (camera confirms pills removed)
- Multiple daily doses (4× per day support)
- Integration with pharmacy auto-refill

### Version 3.0 (18 months)
- Biometric authentication (fingerprint unlock)
- Dose-by-dose pouching system
- AI-powered adherence coaching
- Clinical-grade accuracy for FDA clearance
