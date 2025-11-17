/**
 * Servicio de Notificaciones
 * Maneja notificaciones push, email y SMS
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as twilio from 'twilio';

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal';
}

export interface EmailNotification {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}

export interface SMSNotification {
  to: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio;

  constructor(private configService: ConfigService) {
    // Inicializar Firebase Admin para notificaciones push
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService
            .get('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        }),
      });
    }

    // Inicializar transportador de email
    this.emailTransporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });

    // Inicializar cliente Twilio para SMS
    this.twilioClient = twilio(
      this.configService.get('TWILIO_ACCOUNT_SID'),
      this.configService.get('TWILIO_AUTH_TOKEN'),
    );
  }

  /**
   * Enviar notificación push a través de Firebase Cloud Messaging
   */
  async sendPushNotification(notification: PushNotification): Promise<void> {
    try {
      // En producción, obtener el FCM token del usuario desde la base de datos
      // Por ahora, asumimos que el token se pasa en notification.data.fcmToken
      const fcmToken = notification.data?.fcmToken;

      if (!fcmToken) {
        this.logger.warn(
          `No se encontró FCM token para usuario ${notification.userId}`,
        );
        return;
      }

      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            channelId: 'eldercare_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(
        `✓ Notificación push enviada: ${response} para usuario ${notification.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error enviando notificación push: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Enviar notificación por email
   */
  async sendEmail(email: EmailNotification): Promise<void> {
    try {
      const info = await this.emailTransporter.sendMail({
        from: `"ELDERCARE+" <${this.configService.get('SMTP_FROM')}>`,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        attachments: email.attachments,
      });

      this.logger.log(`✓ Email enviado: ${info.messageId} a ${email.to}`);
    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Enviar SMS
   */
  async sendSMS(sms: SMSNotification): Promise<void> {
    try {
      const message = await this.twilioClient.messages.create({
        body: sms.message,
        from: this.configService.get('TWILIO_PHONE_NUMBER'),
        to: sms.to,
      });

      this.logger.log(`✓ SMS enviado: ${message.sid} a ${sms.to}`);
    } catch (error) {
      this.logger.error(`Error enviando SMS: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Enviar alerta de caída (multi-canal)
   */
  async sendFallAlert(data: {
    elderName: string;
    location: string;
    severity: string;
    familyContacts: Array<{ name: string; email: string; phone: string; fcmToken?: string }>;
  }): Promise<void> {
    const { elderName, location, severity, familyContacts } = data;

    const message = `🚨 ALERTA: Se detectó una caída de ${elderName} en ${location}. Severidad: ${severity}`;

    // Enviar a todos los contactos familiares
    const notifications = familyContacts.map(async (contact) => {
      const promises = [];

      // Push notification
      if (contact.fcmToken) {
        promises.push(
          this.sendPushNotification({
            userId: contact.name,
            title: '🚨 Alerta de Caída',
            body: message,
            data: { fcmToken: contact.fcmToken, type: 'fall_alert' },
            priority: 'high',
          }),
        );
      }

      // Email
      promises.push(
        this.sendEmail({
          to: contact.email,
          subject: '🚨 Alerta de Caída - ELDERCARE+',
          html: `
            <h2 style="color: #F44336;">Alerta de Caída Detectada</h2>
            <p><strong>Adulto Mayor:</strong> ${elderName}</p>
            <p><strong>Ubicación:</strong> ${location}</p>
            <p><strong>Severidad:</strong> ${severity}</p>
            <p><strong>Hora:</strong> ${new Date().toLocaleString('es-ES')}</p>
            <hr>
            <p>Por favor, verifique el estado de ${elderName} lo antes posible.</p>
            <p>Puede ver más detalles en la aplicación ELDERCARE+.</p>
          `,
        }),
      );

      // SMS para severidad alta
      if (severity === 'HIGH') {
        promises.push(
          this.sendSMS({
            to: contact.phone,
            message: `${message}. Verifique inmediatamente.`,
          }),
        );
      }

      return Promise.allSettled(promises);
    });

    await Promise.allSettled(notifications);
    this.logger.log(`✓ Alertas de caída enviadas a ${familyContacts.length} contactos`);
  }

  /**
   * Enviar recordatorio de medicación
   */
  async sendMedicationReminder(data: {
    elderName: string;
    medicationName: string;
    dosage: string;
    time: string;
    fcmToken?: string;
    email?: string;
  }): Promise<void> {
    const { elderName, medicationName, dosage, time, fcmToken, email } = data;

    // Push notification
    if (fcmToken) {
      await this.sendPushNotification({
        userId: elderName,
        title: '💊 Recordatorio de Medicación',
        body: `Es hora de tomar ${medicationName} (${dosage})`,
        data: { fcmToken, type: 'medication_reminder', time },
        priority: 'high',
      });
    }

    // Email backup (opcional)
    if (email) {
      await this.sendEmail({
        to: email,
        subject: '💊 Recordatorio de Medicación',
        html: `
          <h2>Recordatorio de Medicación</h2>
          <p>Estimado/a ${elderName},</p>
          <p>Es hora de tomar su medicación:</p>
          <ul>
            <li><strong>Medicamento:</strong> ${medicationName}</li>
            <li><strong>Dosis:</strong> ${dosage}</li>
            <li><strong>Hora:</strong> ${time}</li>
          </ul>
          <p>Por favor, tome su medicación según lo prescrito.</p>
        `,
      });
    }

    this.logger.log(`✓ Recordatorio de medicación enviado para ${medicationName}`);
  }
}
