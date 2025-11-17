/**
 * Seed de Datos para ELDERCARE+
 * Datos de prueba para ambiente de desarrollo
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { Device } from '../../modules/devices/entities/device.entity';
import { MedicationSchedule } from '../../modules/medication/entities/medication-schedule.entity';
import dataSource from '../../config/typeorm.config';

async function seed() {
  console.log('🌱 Iniciando seed de datos...');

  const connection = await dataSource.initialize();

  try {
    // 1. CREAR USUARIOS DE PRUEBA
    console.log('👥 Creando usuarios...');

    const userRepository = connection.getRepository(User);

    // Adulto mayor
    const elder = userRepository.create({
      email: 'maria.gonzalez@eldercare.test',
      password: await bcrypt.hash('Elder123!', 10),
      firstName: 'María',
      lastName: 'González',
      role: 'ELDER',
      phoneNumber: '+1-555-0101',
      dateOfBirth: new Date('1945-03-15'),
      medicalInfo: {
        allergies: ['Penicilina', 'Mariscos'],
        medications: ['Aspirina', 'Metformina', 'Lisinopril'],
        conditions: ['Diabetes Tipo 2', 'Hipertensión', 'Artritis'],
      },
      emergencyContacts: [
        {
          name: 'Ana González',
          relationship: 'Hija',
          phone: '+1-555-0102',
          email: 'ana.gonzalez@eldercare.test',
        },
        {
          name: 'Carlos González',
          relationship: 'Hijo',
          phone: '+1-555-0103',
          email: 'carlos.gonzalez@eldercare.test',
        },
      ],
      address: {
        street: '123 Calle Principal',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'USA',
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      },
      timezone: 'America/Los_Angeles',
      language: 'es',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
    });

    await userRepository.save(elder);

    // Familiares
    const daughter = userRepository.create({
      email: 'ana.gonzalez@eldercare.test',
      password: await bcrypt.hash('Family123!', 10),
      firstName: 'Ana',
      lastName: 'González',
      role: 'FAMILY_MEMBER',
      phoneNumber: '+1-555-0102',
      timezone: 'America/Los_Angeles',
      language: 'es',
      emailVerified: true,
      isActive: true,
    });

    const son = userRepository.create({
      email: 'carlos.gonzalez@eldercare.test',
      password: await bcrypt.hash('Family123!', 10),
      firstName: 'Carlos',
      lastName: 'González',
      role: 'FAMILY_MEMBER',
      phoneNumber: '+1-555-0103',
      timezone: 'America/New_York',
      language: 'es',
      emailVerified: true,
      isActive: true,
    });

    await userRepository.save([daughter, son]);

    // Cuidador
    const caregiver = userRepository.create({
      email: 'rosa.martinez@eldercare.test',
      password: await bcrypt.hash('Care123!', 10),
      firstName: 'Rosa',
      lastName: 'Martínez',
      role: 'CAREGIVER',
      phoneNumber: '+1-555-0104',
      timezone: 'America/Los_Angeles',
      language: 'es',
      emailVerified: true,
      isActive: true,
    });

    await userRepository.save(caregiver);

    // Proveedor de salud
    const provider = userRepository.create({
      email: 'dr.rodriguez@eldercare.test',
      password: await bcrypt.hash('Doctor123!', 10),
      firstName: 'Dr. Juan',
      lastName: 'Rodríguez',
      role: 'HEALTHCARE_PROVIDER',
      phoneNumber: '+1-555-0105',
      timezone: 'America/Los_Angeles',
      language: 'es',
      emailVerified: true,
      isActive: true,
    });

    await userRepository.save(provider);

    console.log('✓ Usuarios creados');

    // 2. CREAR DISPOSITIVOS IoT
    console.log('📱 Creando dispositivos IoT...');

    const deviceRepository = connection.getRepository(Device);

    // Dispensador de píldoras
    const pillDispenser = deviceRepository.create({
      owner: elder,
      deviceType: 'PILL_DISPENSER',
      serialNumber: 'PILL-2024-001',
      name: 'Dispensador de Cocina',
      status: 'ACTIVE',
      firmwareVersion: '1.2.3',
      hardwareVersion: 'v1.0',
      location: 'Encimera de cocina',
      wifiSsid: 'Casa_Maria',
      wifiSignalStrength: -45,
      batteryLevel: 85,
      lastHeartbeat: new Date(),
      healthStatus: 'HEALTHY',
      healthMetrics: {
        compartmentsFilled: 28,
        missedDispenses: 0,
        uptime: 86400 * 30, // 30 días
      },
      metadata: {
        compartments: 28,
        model: 'ELDERCARE-PD-v1',
        compartmentCapacity: '4 píldoras cada uno',
      },
      provisionedAt: new Date(Date.now() - 86400000 * 90), // 90 días atrás
      activatedAt: new Date(Date.now() - 86400000 * 90),
    });

    // Sensor de caídas - sala
    const fallSensorLiving = deviceRepository.create({
      owner: elder,
      deviceType: 'FALL_SENSOR',
      serialNumber: 'FALL-2024-001',
      name: 'Sensor de Sala',
      status: 'ACTIVE',
      firmwareVersion: '2.1.0',
      hardwareVersion: 'v2.0',
      location: 'Sala de estar',
      wifiSsid: 'Casa_Maria',
      wifiSignalStrength: -52,
      lastHeartbeat: new Date(),
      healthStatus: 'HEALTHY',
      healthMetrics: {
        radarStatus: 'operational',
        coverageArea: '500 sq ft',
        detectionsSinceLastMaintenance: 125000,
      },
      metadata: {
        radarFrequency: '60 GHz',
        mlModel: 'fall-detection-v2.1',
        sensitivity: 'high',
      },
      provisionedAt: new Date(Date.now() - 86400000 * 60),
      activatedAt: new Date(Date.now() - 86400000 * 60),
    });

    // Sensor de caídas - habitación
    const fallSensorBedroom = deviceRepository.create({
      owner: elder,
      deviceType: 'FALL_SENSOR',
      serialNumber: 'FALL-2024-002',
      name: 'Sensor de Habitación',
      status: 'ACTIVE',
      firmwareVersion: '2.1.0',
      hardwareVersion: 'v2.0',
      location: 'Habitación principal',
      wifiSsid: 'Casa_Maria',
      wifiSignalStrength: -48,
      lastHeartbeat: new Date(),
      healthStatus: 'HEALTHY',
      healthMetrics: {
        radarStatus: 'operational',
        coverageArea: '400 sq ft',
        detectionsSinceLastMaintenance: 98000,
      },
      metadata: {
        radarFrequency: '60 GHz',
        mlModel: 'fall-detection-v2.1',
        sensitivity: 'high',
      },
      provisionedAt: new Date(Date.now() - 86400000 * 60),
      activatedAt: new Date(Date.now() - 86400000 * 60),
    });

    await deviceRepository.save([pillDispenser, fallSensorLiving, fallSensorBedroom]);

    console.log('✓ Dispositivos creados');

    // 3. CREAR HORARIOS DE MEDICAMENTOS
    console.log('💊 Creando horarios de medicamentos...');

    const medicationRepository = connection.getRepository(MedicationSchedule);

    // Aspirina
    const aspirin = medicationRepository.create({
      user: elder,
      device: pillDispenser,
      medicationName: 'Aspirina',
      genericName: 'Ácido acetilsalicílico',
      dosage: '81mg',
      dosageForm: 'TABLET',
      frequency: 'ONCE_DAILY',
      timesOfDay: ['08:00'],
      instructions: 'Tomar con el desayuno',
      prescribingPhysician: 'Dr. Juan Rodríguez',
      prescribedDate: new Date('2023-01-15'),
      startDate: new Date('2023-01-20'),
      refillInfo: {
        pharmacy: 'Farmacia Central',
        pharmacyPhone: '+1-555-0200',
        lastRefill: new Date('2024-10-01'),
        refillsRemaining: 3,
      },
      sideEffects: ['Malestar estomacal', 'Sangrado fácil'],
      compartmentNumber: 1,
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
      isActive: true,
    });

    // Metformina
    const metformin = medicationRepository.create({
      user: elder,
      device: pillDispenser,
      medicationName: 'Metformina',
      genericName: 'Metformina HCl',
      dosage: '500mg',
      dosageForm: 'TABLET',
      frequency: 'TWICE_DAILY',
      timesOfDay: ['08:00', '20:00'],
      instructions: 'Tomar con alimentos',
      prescribingPhysician: 'Dr. Juan Rodríguez',
      prescribedDate: new Date('2023-01-15'),
      startDate: new Date('2023-01-20'),
      refillInfo: {
        pharmacy: 'Farmacia Central',
        pharmacyPhone: '+1-555-0200',
        lastRefill: new Date('2024-10-15'),
        refillsRemaining: 5,
      },
      sideEffects: ['Náuseas', 'Diarrea', 'Dolor abdominal'],
      compartmentNumber: 2,
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
      isActive: true,
    });

    // Lisinopril
    const lisinopril = medicationRepository.create({
      user: elder,
      device: pillDispenser,
      medicationName: 'Lisinopril',
      genericName: 'Lisinopril',
      dosage: '10mg',
      dosageForm: 'TABLET',
      frequency: 'ONCE_DAILY',
      timesOfDay: ['08:00'],
      instructions: 'Tomar en ayunas o con alimentos',
      prescribingPhysician: 'Dr. Juan Rodríguez',
      prescribedDate: new Date('2023-02-01'),
      startDate: new Date('2023-02-05'),
      refillInfo: {
        pharmacy: 'Farmacia Central',
        pharmacyPhone: '+1-555-0200',
        lastRefill: new Date('2024-11-01'),
        refillsRemaining: 4,
      },
      sideEffects: ['Mareos', 'Tos seca', 'Fatiga'],
      interactions: ['Evitar suplementos de potasio', 'No tomar con AINEs'],
      compartmentNumber: 3,
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
      isActive: true,
    });

    await medicationRepository.save([aspirin, metformin, lisinopril]);

    console.log('✓ Medicamentos creados');

    console.log('\n✅ Seed completado exitosamente!\n');
    console.log('📧 Credenciales de acceso:');
    console.log('─────────────────────────────────────');
    console.log('Adulto Mayor:');
    console.log('  Email: maria.gonzalez@eldercare.test');
    console.log('  Password: Elder123!');
    console.log('\nFamilia (Hija):');
    console.log('  Email: ana.gonzalez@eldercare.test');
    console.log('  Password: Family123!');
    console.log('\nFamilia (Hijo):');
    console.log('  Email: carlos.gonzalez@eldercare.test');
    console.log('  Password: Family123!');
    console.log('\nCuidador:');
    console.log('  Email: rosa.martinez@eldercare.test');
    console.log('  Password: Care123!');
    console.log('\nMédico:');
    console.log('  Email: dr.rodriguez@eldercare.test');
    console.log('  Password: Doctor123!');
    console.log('─────────────────────────────────────\n');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await connection.destroy();
  }
}

// Ejecutar seed
seed()
  .then(() => {
    console.log('🎉 Seed finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed falló:', error);
    process.exit(1);
  });
