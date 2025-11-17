/**
 * ELDERCARE+ Smart Pill Dispenser Firmware
 *
 * Hardware: ESP32-WROOM-32D
 * RTOS: FreeRTOS v10.4.6
 * Communication: MQTT over TLS 1.3
 *
 * @file main.cpp
 * @author ELDERCARE+ Engineering Team
 * @version 1.0.0
 */

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>

// Libraries
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <RTClib.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <Stepper.h>
#include <ESP32Servo.h>
#include <EEPROM.h>
#include <esp_task_wdt.h>
#include <mbedtls/aes.h>

// Configuration
#include "config.h"
#include "secrets.h"

// ============================================================================
// Hardware Pin Definitions
// ============================================================================

// Stepper Motor (28BYJ-48)
#define MOTOR_IN1       26
#define MOTOR_IN2       27
#define MOTOR_IN3       14
#define MOTOR_IN4       12
#define STEPS_PER_REV   2048
#define COMPARTMENTS    28
#define STEPS_PER_COMP  (STEPS_PER_REV / COMPARTMENTS)  // 73 steps

// Servo (Dispensing Gate)
#define SERVO_PIN       13
#define SERVO_CLOSED    0
#define SERVO_OPEN      90

// Position Encoder (AS5600 - I2C)
#define ENCODER_SDA     21
#define ENCODER_SCL     22

// Sensors
#define IR_LED_PIN      25
#define IR_SENSOR_PIN   34  // ADC
#define TEMP_HUMID_SDA  21  // Shared I2C
#define TEMP_HUMID_SCL  22
#define LID_SENSOR_PIN  35  // Reed switch

// User Interface
#define LED_RING_PIN    33
#define LED_COUNT       28
#define BUZZER_PIN      32
#define BUTTON_MAIN     39  // "I took my meds"
#define BUTTON_CONFIG   36  // Reset/pairing

// Display (OLED SSD1306 - I2C)
#define OLED_SDA        21  // Shared I2C
#define OLED_SCL        22
#define OLED_WIDTH      128
#define OLED_HEIGHT     64
#define OLED_ADDR       0x3C

// Power Management
#define BATTERY_ADC     35
#define CHARGING_PIN    4   // HIGH when charging

// ============================================================================
// Global Objects
// ============================================================================

// Hardware
Stepper motorCarousel(STEPS_PER_REV, MOTOR_IN1, MOTOR_IN3, MOTOR_IN2, MOTOR_IN4);
Servo servoGate;
Adafruit_NeoPixel ledRing(LED_COUNT, LED_RING_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
Adafruit_SHT31 sht31;
RTC_DS3231 rtc;

// Communication
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// RTOS
QueueHandle_t dispenseQueue;
QueueHandle_t alertQueue;
QueueHandle_t eventQueue;
SemaphoreHandle_t i2cMutex;
SemaphoreHandle_t wifiMutex;

// ============================================================================
// Data Structures
// ============================================================================

struct MedicationSchedule {
    uint8_t compartment;      // 0-27
    uint8_t hour;             // 0-23
    uint8_t minute;           // 0-59
    char name[32];            // Medication name
    bool enabled;
    bool taken;
    uint32_t scheduledTime;   // Unix timestamp
};

struct DispenseEvent {
    uint8_t compartment;
    uint32_t scheduledTime;
    uint32_t actualTime;
    bool pillRemoved;
    int32_t delaySeconds;
    char medicationName[32];
};

struct DeviceState {
    uint8_t currentCompartment;
    bool lidOpen;
    float batteryVoltage;
    uint8_t batteryPercent;
    bool charging;
    float temperature;
    float humidity;
    bool wifiConnected;
    bool mqttConnected;
    uint32_t lastHeartbeat;
    char firmwareVersion[16];
};

// Global State
MedicationSchedule schedule[28];  // One per compartment
DeviceState deviceState;
volatile bool scheduleUpdated = false;

// ============================================================================
// Configuration
// ============================================================================

#define DEVICE_ID           "PILL_DISPENSER_001"  // Unique per device
#define MQTT_BROKER         "a3xxxxxxxx-ats.iot.us-east-1.amazonaws.com"
#define MQTT_PORT           8883
#define NTP_SERVER          "pool.ntp.org"
#define TIMEZONE_OFFSET     -5  // EST (adjust per location)

// MQTT Topics
#define TOPIC_TELEMETRY     "eldercare/" DEVICE_ID "/telemetry"
#define TOPIC_EVENTS        "eldercare/" DEVICE_ID "/events/dispense"
#define TOPIC_MISSED        "eldercare/" DEVICE_ID "/events/missed"
#define TOPIC_STATUS        "eldercare/" DEVICE_ID "/status"
#define TOPIC_CMD_SCHEDULE  "eldercare/" DEVICE_ID "/commands/schedule"
#define TOPIC_CMD_DISPENSE  "eldercare/" DEVICE_ID "/commands/dispense_now"
#define TOPIC_CMD_CONFIG    "eldercare/" DEVICE_ID "/commands/config"
#define TOPIC_CMD_OTA       "eldercare/" DEVICE_ID "/commands/update_firmware"

// Timing Constants
#define HEARTBEAT_INTERVAL  60000    // 60 seconds
#define ALERT_DURATION      120000   // 2 minutes
#define ALERT_REMINDER      600000   // 10 minutes
#define WATCHDOG_TIMEOUT    30       // 30 seconds

// ============================================================================
// Function Prototypes
// ============================================================================

// Tasks
void TaskMotorControl(void *pvParameters);
void TaskAlertManagement(void *pvParameters);
void TaskMQTTCommunication(void *pvParameters);
void TaskRTCSync(void *pvParameters);
void TaskPowerManagement(void *pvParameters);

// Hardware
void initHardware();
void rotateToCompartment(uint8_t target);
void openGate();
void closeGate();
bool isPillRemoved();
void playAlert(uint8_t type);
void updateDisplay(const char* line1, const char* line2 = "");
void setLEDCompartment(uint8_t compartment, uint32_t color);
void clearAllLEDs();

// Communication
void initWiFi();
void initMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishTelemetry();
void publishDispenseEvent(const DispenseEvent& event);
void publishMissedDose(uint8_t compartment);

// Scheduling
void checkSchedule();
void loadScheduleFromEEPROM();
void saveScheduleToEEPROM();
void updateScheduleFromMQTT(const char* json);

// Power
void enterDeepSleep(uint32_t seconds);
float readBatteryVoltage();
uint8_t calculateBatteryPercent(float voltage);

// Time
void syncTimeNTP();
uint32_t getCurrentTimestamp();

// ============================================================================
// Setup
// ============================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("==================================");
    Serial.println("ELDERCARE+ Pill Dispenser v1.0.0");
    Serial.println("==================================");

    // Initialize hardware
    initHardware();

    // Create RTOS synchronization primitives
    dispenseQueue = xQueueCreate(10, sizeof(uint8_t));
    alertQueue = xQueueCreate(10, sizeof(uint8_t));
    eventQueue = xQueueCreate(20, sizeof(DispenseEvent));
    i2cMutex = xSemaphoreCreateMutex();
    wifiMutex = xSemaphoreCreateMutex();

    // Initialize connectivity
    initWiFi();
    initMQTT();

    // Sync time
    syncTimeNTP();

    // Load medication schedule from EEPROM
    loadScheduleFromEEPROM();

    // Initialize device state
    strcpy(deviceState.firmwareVersion, "1.0.0");
    deviceState.currentCompartment = 0;
    deviceState.lastHeartbeat = 0;

    // Create FreeRTOS tasks
    xTaskCreatePinnedToCore(
        TaskMotorControl,
        "MotorControl",
        8192,   // Stack size
        NULL,
        5,      // Priority (highest for motor control)
        NULL,
        1       // Core 1
    );

    xTaskCreatePinnedToCore(
        TaskAlertManagement,
        "AlertManagement",
        4096,
        NULL,
        4,      // Priority
        NULL,
        1       // Core 1
    );

    xTaskCreatePinnedToCore(
        TaskMQTTCommunication,
        "MQTT",
        8192,
        NULL,
        3,      // Priority
        NULL,
        0       // Core 0 (WiFi runs on core 0)
    );

    xTaskCreatePinnedToCore(
        TaskRTCSync,
        "RTCSync",
        4096,
        NULL,
        2,      // Priority
        NULL,
        0       // Core 0
    );

    xTaskCreatePinnedToCore(
        TaskPowerManagement,
        "PowerMgmt",
        2048,
        NULL,
        1,      // Priority (low)
        NULL,
        0       // Core 0
    );

    // Enable watchdog timer
    esp_task_wdt_init(WATCHDOG_TIMEOUT, true);
    esp_task_wdt_add(NULL);

    Serial.println("System initialized successfully!");
    updateDisplay("ELDERCARE+", "Ready");
}

void loop() {
    // Empty - all work done in FreeRTOS tasks
    vTaskDelay(pdMS_TO_TICKS(1000));
    esp_task_wdt_reset();
}

// ============================================================================
// Hardware Initialization
// ============================================================================

void initHardware() {
    Serial.println("Initializing hardware...");

    // GPIO
    pinMode(IR_LED_PIN, OUTPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(BUTTON_MAIN, INPUT_PULLUP);
    pinMode(BUTTON_CONFIG, INPUT_PULLUP);
    pinMode(LID_SENSOR_PIN, INPUT_PULLUP);
    pinMode(CHARGING_PIN, INPUT);

    digitalWrite(IR_LED_PIN, HIGH);  // IR LED always on

    // I2C
    Wire.begin(ENCODER_SDA, ENCODER_SCL);

    // Motor
    motorCarousel.setSpeed(10);  // RPM

    // Servo
    servoGate.attach(SERVO_PIN);
    closeGate();

    // LED Ring
    ledRing.begin();
    ledRing.setBrightness(50);
    ledRing.show();  // Initialize all pixels to 'off'

    // OLED Display
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
        Serial.println("ERROR: SSD1306 allocation failed");
    } else {
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println("ELDERCARE+");
        display.display();
    }

    // Temperature/Humidity Sensor
    if (!sht31.begin(0x44)) {
        Serial.println("ERROR: SHT31 not found");
    }

    // RTC
    if (!rtc.begin()) {
        Serial.println("ERROR: RTC not found");
    }

    if (rtc.lostPower()) {
        Serial.println("RTC lost power, setting time...");
        rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }

    // EEPROM
    EEPROM.begin(512);

    Serial.println("Hardware initialized!");
}

// ============================================================================
// Task: Motor Control
// ============================================================================

void TaskMotorControl(void *pvParameters) {
    uint8_t targetCompartment;

    Serial.println("Task: MotorControl started");

    while (true) {
        // Wait for dispense command
        if (xQueueReceive(dispenseQueue, &targetCompartment, portMAX_DELAY) == pdTRUE) {
            Serial.printf("Dispensing compartment %d\n", targetCompartment);

            // Highlight target compartment
            setLEDCompartment(targetCompartment, ledRing.Color(0, 255, 0));

            // Rotate carousel to target
            rotateToCompartment(targetCompartment);

            // Open dispensing gate
            openGate();

            // Wait for pill removal (or timeout)
            uint32_t startTime = millis();
            bool pillTaken = false;

            while (millis() - startTime < ALERT_DURATION) {
                if (isPillRemoved()) {
                    pillTaken = true;
                    Serial.println("Pill removed - success!");

                    // Play success tone
                    tone(BUZZER_PIN, 1000, 200);
                    delay(200);
                    tone(BUZZER_PIN, 1500, 200);

                    // Update LED to blue (taken)
                    setLEDCompartment(targetCompartment, ledRing.Color(0, 0, 255));

                    break;
                }

                // Check for manual acknowledgment button
                if (digitalRead(BUTTON_MAIN) == LOW) {
                    pillTaken = true;
                    Serial.println("Manual acknowledgment");
                    break;
                }

                vTaskDelay(pdMS_TO_TICKS(100));
            }

            // Close gate
            closeGate();

            // Log event
            DispenseEvent event;
            event.compartment = targetCompartment;
            event.scheduledTime = schedule[targetCompartment].scheduledTime;
            event.actualTime = getCurrentTimestamp();
            event.pillRemoved = pillTaken;
            event.delaySeconds = event.actualTime - event.scheduledTime;
            strncpy(event.medicationName, schedule[targetCompartment].name, 32);

            xQueueSend(eventQueue, &event, 0);

            // Update schedule
            schedule[targetCompartment].taken = pillTaken;

            if (!pillTaken) {
                // Missed dose - send alert
                xQueueSend(alertQueue, &targetCompartment, 0);
            } else {
                clearAllLEDs();
            }

            // Update current position
            deviceState.currentCompartment = targetCompartment;
        }
    }
}

// ============================================================================
// Task: Alert Management
// ============================================================================

void TaskAlertManagement(void *pvParameters) {
    uint8_t compartment;

    Serial.println("Task: AlertManagement started");

    while (true) {
        // Check for missed doses
        if (xQueueReceive(alertQueue, &compartment, pdMS_TO_TICKS(1000)) == pdTRUE) {
            Serial.printf("ALERT: Missed dose - compartment %d\n", compartment);

            // Visual alert (red LED)
            setLEDCompartment(compartment, ledRing.Color(255, 0, 0));

            // Publish missed dose event
            publishMissedDose(compartment);

            // Audible alert pattern
            for (int i = 0; i < 3; i++) {
                playAlert(1);  // Urgent alert
                vTaskDelay(pdMS_TO_TICKS(5000));
            }
        }

        // Regular schedule check (every minute)
        checkSchedule();

        vTaskDelay(pdMS_TO_TICKS(30000));  // Check every 30 seconds
    }
}

// ============================================================================
// Task: MQTT Communication
// ============================================================================

void TaskMQTTCommunication(void *pvParameters) {
    TickType_t lastHeartbeat = 0;
    DispenseEvent event;

    Serial.println("Task: MQTT started");

    while (true) {
        // Maintain MQTT connection
        if (!mqttClient.connected()) {
            Serial.println("MQTT disconnected, reconnecting...");

            if (mqttClient.connect(DEVICE_ID)) {
                Serial.println("MQTT connected!");

                // Subscribe to command topics
                mqttClient.subscribe(TOPIC_CMD_SCHEDULE);
                mqttClient.subscribe(TOPIC_CMD_DISPENSE);
                mqttClient.subscribe(TOPIC_CMD_CONFIG);
                mqttClient.subscribe(TOPIC_CMD_OTA);

                // Publish online status
                mqttClient.publish(TOPIC_STATUS, "{\"status\":\"online\"}", true);
            } else {
                Serial.printf("MQTT connect failed, rc=%d\n", mqttClient.state());
                vTaskDelay(pdMS_TO_TICKS(5000));
                continue;
            }
        }

        mqttClient.loop();

        // Publish heartbeat telemetry
        if (xTaskGetTickCount() - lastHeartbeat > pdMS_TO_TICKS(HEARTBEAT_INTERVAL)) {
            publishTelemetry();
            lastHeartbeat = xTaskGetTickCount();
        }

        // Publish dispense events from queue
        if (xQueueReceive(eventQueue, &event, 0) == pdTRUE) {
            publishDispenseEvent(event);
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// ============================================================================
// Task: RTC Sync
// ============================================================================

void TaskRTCSync(void *pvParameters) {
    Serial.println("Task: RTCSync started");

    while (true) {
        // Sync with NTP every 24 hours
        syncTimeNTP();

        // Sleep for 24 hours
        vTaskDelay(pdMS_TO_TICKS(24 * 60 * 60 * 1000));
    }
}

// ============================================================================
// Task: Power Management
// ============================================================================

void TaskPowerManagement(void *pvParameters) {
    Serial.println("Task: PowerManagement started");

    while (true) {
        // Read battery voltage
        deviceState.batteryVoltage = readBatteryVoltage();
        deviceState.batteryPercent = calculateBatteryPercent(deviceState.batteryVoltage);
        deviceState.charging = digitalRead(CHARGING_PIN) == HIGH;

        // Read temperature/humidity
        if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            deviceState.temperature = sht31.readTemperature();
            deviceState.humidity = sht31.readHumidity();
            xSemaphoreGive(i2cMutex);
        }

        // Check lid status
        deviceState.lidOpen = digitalRead(LID_SENSOR_PIN) == HIGH;

        // Low battery warning
        if (deviceState.batteryPercent < 20 && !deviceState.charging) {
            Serial.println("WARNING: Low battery!");
            // TODO: Send low battery alert
        }

        // Sleep for 5 minutes
        vTaskDelay(pdMS_TO_TICKS(5 * 60 * 1000));
    }
}

// ============================================================================
// Hardware Functions
// ============================================================================

void rotateToCompartment(uint8_t target) {
    uint8_t current = deviceState.currentCompartment;
    int8_t delta = target - current;

    // Calculate shortest path (circular)
    if (delta > COMPARTMENTS / 2) {
        delta -= COMPARTMENTS;
    } else if (delta < -COMPARTMENTS / 2) {
        delta += COMPARTMENTS;
    }

    int steps = delta * STEPS_PER_COMP;

    Serial.printf("Rotating from %d to %d (%d steps)\n", current, target, steps);

    motorCarousel.step(steps);

    delay(500);  // Settle time
}

void openGate() {
    Serial.println("Opening gate");
    servoGate.write(SERVO_OPEN);
    delay(500);
}

void closeGate() {
    Serial.println("Closing gate");
    servoGate.write(SERVO_CLOSED);
    delay(500);
}

bool isPillRemoved() {
    // IR break-beam sensor
    int sensorValue = analogRead(IR_SENSOR_PIN);

    // If beam is broken (pill removed), reading will be low
    return sensorValue < 1000;  // Threshold (calibrate)
}

void playAlert(uint8_t type) {
    if (type == 0) {
        // Gentle reminder
        tone(BUZZER_PIN, 1000, 500);
    } else {
        // Urgent alert
        for (int i = 0; i < 5; i++) {
            tone(BUZZER_PIN, 2000, 100);
            delay(100);
            noTone(BUZZER_PIN);
            delay(100);
        }
    }
}

void updateDisplay(const char* line1, const char* line2) {
    if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        display.clearDisplay();
        display.setCursor(0, 0);
        display.setTextSize(2);
        display.println(line1);
        display.setTextSize(1);
        display.println(line2);
        display.display();
        xSemaphoreGive(i2cMutex);
    }
}

void setLEDCompartment(uint8_t compartment, uint32_t color) {
    ledRing.setPixelColor(compartment, color);
    ledRing.show();
}

void clearAllLEDs() {
    ledRing.clear();
    ledRing.show();
}

// ============================================================================
// Communication Functions
// ============================================================================

void initWiFi() {
    Serial.print("Connecting to WiFi");

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        deviceState.wifiConnected = true;
    } else {
        Serial.println("\nWiFi connection failed!");
        deviceState.wifiConnected = false;
    }
}

void initMQTT() {
    // Load X.509 certificates from EEPROM/SPIFFS
    // (In production, use ATECC608A hardware crypto module)
    wifiClient.setCACert(AWS_CERT_CA);
    wifiClient.setCertificate(AWS_CERT_CRT);
    wifiClient.setPrivateKey(AWS_CERT_PRIVATE);

    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(2048);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("MQTT message: %s\n", topic);

    // Parse JSON payload
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload, length);

    if (error) {
        Serial.println("JSON parse error");
        return;
    }

    // Handle commands
    if (strcmp(topic, TOPIC_CMD_SCHEDULE) == 0) {
        // Update medication schedule
        updateScheduleFromMQTT((const char*)payload);
    }
    else if (strcmp(topic, TOPIC_CMD_DISPENSE) == 0) {
        // Manual dispense command
        uint8_t compartment = doc["compartment"];
        xQueueSend(dispenseQueue, &compartment, 0);
    }
    else if (strcmp(topic, TOPIC_CMD_CONFIG) == 0) {
        // Configuration update (LED brightness, alert volume, etc.)
        // TODO: Implement
    }
    else if (strcmp(topic, TOPIC_CMD_OTA) == 0) {
        // OTA firmware update
        // TODO: Implement secure OTA
    }
}

void publishTelemetry() {
    StaticJsonDocument<512> doc;

    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = getCurrentTimestamp();
    doc["firmware_version"] = deviceState.firmwareVersion;

    JsonObject env = doc.createNestedObject("environment");
    env["temperature"] = deviceState.temperature;
    env["humidity"] = deviceState.humidity;

    JsonObject power = doc.createNestedObject("power");
    power["battery_voltage"] = deviceState.batteryVoltage;
    power["battery_percent"] = deviceState.batteryPercent;
    power["charging"] = deviceState.charging;

    doc["lid_open"] = deviceState.lidOpen;
    doc["current_compartment"] = deviceState.currentCompartment;

    char buffer[512];
    serializeJson(doc, buffer);

    mqttClient.publish(TOPIC_TELEMETRY, buffer);

    Serial.println("Telemetry published");
}

void publishDispenseEvent(const DispenseEvent& event) {
    StaticJsonDocument<512> doc;

    doc["device_id"] = DEVICE_ID;
    doc["scheduled_time"] = event.scheduledTime;
    doc["actual_time"] = event.actualTime;
    doc["compartment"] = event.compartment;
    doc["medication_name"] = event.medicationName;
    doc["pill_removed"] = event.pillRemoved;
    doc["delay_seconds"] = event.delaySeconds;

    char buffer[512];
    serializeJson(doc, buffer);

    mqttClient.publish(TOPIC_EVENTS, buffer);

    Serial.println("Dispense event published");
}

void publishMissedDose(uint8_t compartment) {
    StaticJsonDocument<256> doc;

    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = getCurrentTimestamp();
    doc["compartment"] = compartment;
    doc["medication_name"] = schedule[compartment].name;
    doc["scheduled_time"] = schedule[compartment].scheduledTime;

    char buffer[256];
    serializeJson(doc, buffer);

    mqttClient.publish(TOPIC_MISSED, buffer);

    Serial.println("Missed dose alert published");
}

// ============================================================================
// Schedule Management
// ============================================================================

void checkSchedule() {
    uint32_t now = getCurrentTimestamp();
    DateTime currentTime = rtc.now();

    for (uint8_t i = 0; i < COMPARTMENTS; i++) {
        if (!schedule[i].enabled || schedule[i].taken) {
            continue;
        }

        // Check if it's time to dispense
        if (currentTime.hour() == schedule[i].hour &&
            currentTime.minute() == schedule[i].minute) {

            Serial.printf("Time to dispense compartment %d\n", i);

            // Trigger dispense
            xQueueSend(dispenseQueue, &i, 0);
        }
    }
}

void loadScheduleFromEEPROM() {
    // Load schedule from EEPROM
    // Format: 28 entries × 64 bytes = 1792 bytes

    for (uint8_t i = 0; i < COMPARTMENTS; i++) {
        EEPROM.get(i * sizeof(MedicationSchedule), schedule[i]);

        // Validate
        if (schedule[i].compartment != i) {
            // Invalid data, initialize defaults
            schedule[i].compartment = i;
            schedule[i].enabled = false;
            schedule[i].taken = false;
            strcpy(schedule[i].name, "Empty");
        }
    }

    Serial.println("Schedule loaded from EEPROM");
}

void saveScheduleToEEPROM() {
    for (uint8_t i = 0; i < COMPARTMENTS; i++) {
        EEPROM.put(i * sizeof(MedicationSchedule), schedule[i]);
    }
    EEPROM.commit();

    Serial.println("Schedule saved to EEPROM");
}

void updateScheduleFromMQTT(const char* json) {
    StaticJsonDocument<2048> doc;
    deserializeJson(doc, json);

    JsonArray items = doc["schedule"];

    for (JsonObject item : items) {
        uint8_t compartment = item["compartment"];

        if (compartment < COMPARTMENTS) {
            schedule[compartment].hour = item["hour"];
            schedule[compartment].minute = item["minute"];
            strncpy(schedule[compartment].name, item["name"], 32);
            schedule[compartment].enabled = item["enabled"];
            schedule[compartment].taken = false;
        }
    }

    saveScheduleToEEPROM();
    scheduleUpdated = true;

    Serial.println("Schedule updated from MQTT");
}

// ============================================================================
// Utility Functions
// ============================================================================

void syncTimeNTP() {
    configTime(TIMEZONE_OFFSET * 3600, 0, NTP_SERVER);

    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
        rtc.adjust(DateTime(
            timeinfo.tm_year + 1900,
            timeinfo.tm_mon + 1,
            timeinfo.tm_mday,
            timeinfo.tm_hour,
            timeinfo.tm_min,
            timeinfo.tm_sec
        ));

        Serial.println("Time synchronized via NTP");
    } else {
        Serial.println("Failed to sync time");
    }
}

uint32_t getCurrentTimestamp() {
    DateTime now = rtc.now();
    return now.unixtime();
}

float readBatteryVoltage() {
    // ADC reading: 0-4095 → 0-3.3V
    // Battery: 3.0V-4.2V (Li-ion)
    // Voltage divider: 2:1 (to fit in 3.3V range)

    int raw = analogRead(BATTERY_ADC);
    float voltage = (raw / 4095.0) * 3.3 * 2.0;

    return voltage;
}

uint8_t calculateBatteryPercent(float voltage) {
    // Li-ion discharge curve (approximate)
    // 4.2V = 100%, 3.7V = 50%, 3.0V = 0%

    if (voltage >= 4.2) return 100;
    if (voltage <= 3.0) return 0;

    // Linear approximation
    float percent = (voltage - 3.0) / (4.2 - 3.0) * 100.0;

    return (uint8_t)percent;
}
