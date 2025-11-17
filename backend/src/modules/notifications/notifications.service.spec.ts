/**
 * Tests Unitarios para NotificationsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        FIREBASE_SERVER_KEY: 'test-firebase-key',
        TWILIO_ACCOUNT_SID: 'test-sid',
        TWILIO_AUTH_TOKEN: 'test-token',
        TWILIO_PHONE_NUMBER: '+1234567890',
        SMTP_HOST: 'smtp.test.com',
        SMTP_PORT: 587,
        SMTP_USER: 'test@test.com',
        SMTP_PASSWORD: 'test-password',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPushNotification', () => {
    it('should send push notification successfully', async () => {
      const fcmToken = 'test-fcm-token';
      const title = 'Test Title';
      const body = 'Test Body';
      const data = { key: 'value' };

      // Mock fetch para simular respuesta de Firebase
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: 1 }),
        })
      ) as jest.Mock;

      const result = await service.sendPushNotification(
        fcmToken,
        title,
        body,
        data
      );

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://fcm.googleapis.com/fcm/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'key=test-firebase-key',
          }),
        })
      );
    });

    it('should handle push notification failure', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Unauthorized',
        })
      ) as jest.Mock;

      const result = await service.sendPushNotification(
        'test-token',
        'Title',
        'Body'
      );

      expect(result).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const to = 'test@example.com';
      const subject = 'Test Subject';
      const htmlContent = '<p>Test Content</p>';

      // Mock nodemailer
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      service['transporter'] = {
        sendMail: mockSendMail,
      } as any;

      const result = await service.sendEmail(to, subject, htmlContent);

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'ELDERCARE+ <test@test.com>',
        to,
        subject,
        html: htmlContent,
      });
    });

    it('should handle email sending failure', async () => {
      const mockSendMail = jest
        .fn()
        .mockRejectedValue(new Error('SMTP error'));
      service['transporter'] = {
        sendMail: mockSendMail,
      } as any;

      const result = await service.sendEmail(
        'test@example.com',
        'Subject',
        'Content'
      );

      expect(result).toBe(false);
    });
  });

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      const to = '+1234567890';
      const message = 'Test SMS';

      // Mock Twilio client
      const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM123' });
      service['twilioClient'] = {
        messages: {
          create: mockCreate,
        },
      } as any;

      const result = await service.sendSMS(to, message);

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        body: message,
        from: '+1234567890',
        to,
      });
    });

    it('should handle SMS sending failure', async () => {
      const mockCreate = jest
        .fn()
        .mockRejectedValue(new Error('Twilio error'));
      service['twilioClient'] = {
        messages: {
          create: mockCreate,
        },
      } as any;

      const result = await service.sendSMS('+1234567890', 'Message');

      expect(result).toBe(false);
    });
  });

  describe('sendMultiChannelNotification', () => {
    it('should send notifications through all channels', async () => {
      const sendPushSpy = jest
        .spyOn(service, 'sendPushNotification')
        .mockResolvedValue(true);
      const sendEmailSpy = jest
        .spyOn(service, 'sendEmail')
        .mockResolvedValue(true);
      const sendSMSSpy = jest.spyOn(service, 'sendSMS').mockResolvedValue(true);

      const recipient = {
        fcmToken: 'token',
        email: 'test@test.com',
        phone: '+1234567890',
      };

      await service.sendMultiChannelNotification(
        recipient,
        'Title',
        'Body',
        ['push', 'email', 'sms']
      );

      expect(sendPushSpy).toHaveBeenCalled();
      expect(sendEmailSpy).toHaveBeenCalled();
      expect(sendSMSSpy).toHaveBeenCalled();
    });

    it('should only send through specified channels', async () => {
      const sendPushSpy = jest
        .spyOn(service, 'sendPushNotification')
        .mockResolvedValue(true);
      const sendEmailSpy = jest
        .spyOn(service, 'sendEmail')
        .mockResolvedValue(true);
      const sendSMSSpy = jest.spyOn(service, 'sendSMS').mockResolvedValue(true);

      const recipient = {
        fcmToken: 'token',
        email: 'test@test.com',
        phone: '+1234567890',
      };

      await service.sendMultiChannelNotification(
        recipient,
        'Title',
        'Body',
        ['push']
      );

      expect(sendPushSpy).toHaveBeenCalled();
      expect(sendEmailSpy).not.toHaveBeenCalled();
      expect(sendSMSSpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyFallDetected', () => {
    it('should send fall detection notification with correct content', async () => {
      const sendMultiChannelSpy = jest
        .spyOn(service, 'sendMultiChannelNotification')
        .mockResolvedValue(undefined);

      const fallData = {
        elderName: 'María González',
        severity: 'HIGH',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      const emergencyContact = {
        fcmToken: 'token',
        email: 'emergency@test.com',
        phone: '+1234567890',
      };

      await service.notifyFallDetected(fallData, emergencyContact);

      expect(sendMultiChannelSpy).toHaveBeenCalledWith(
        emergencyContact,
        '⚠️ ALERTA: Caída Detectada',
        expect.stringContaining('María González'),
        ['push', 'sms', 'email']
      );
    });
  });

  describe('sendMedicationReminder', () => {
    it('should send medication reminder with correct format', async () => {
      const sendMultiChannelSpy = jest
        .spyOn(service, 'sendMultiChannelNotification')
        .mockResolvedValue(undefined);

      const medicationData = {
        name: 'Aspirina',
        dosage: '100mg',
        scheduledTime: new Date('2024-01-01T08:00:00Z'),
      };

      const patient = {
        fcmToken: 'token',
        email: 'patient@test.com',
        phone: '+1234567890',
      };

      await service.sendMedicationReminder(medicationData, patient);

      expect(sendMultiChannelSpy).toHaveBeenCalledWith(
        patient,
        '💊 Recordatorio de Medicación',
        expect.stringContaining('Aspirina'),
        ['push', 'email']
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
