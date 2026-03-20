import webpush from 'web-push';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Initialize web-push when needed
const initWebPush = () => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys not configured, push notifications will not work');
      return false;
    }
    
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Web-push initialized successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ Web-push initialization failed:', error.message);
    return false;
  }
};

// Get Supabase client (lazy initialization)
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

const emailTransporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

class NotificationService {
  // Send push notification
  async sendPushNotification(subscription, notification) {
    try {
      if (!subscription || !subscription.endpoint) {
        console.warn('Invalid subscription');
        return;
      }

      // Initialize web-push if not already done
      if (!initWebPush()) {
        console.warn('Cannot send push notification - VAPID keys not configured');
        return;
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        tag: notification.tag,
        icon: notification.icon,
        interviewId: notification.interviewId,
        url: notification.url,
        requireInteraction: notification.requireInteraction || false
      });

      await webpush.sendNotification(subscription, payload);
      console.log('Push notification sent successfully');

      await this.logNotification({
        userId: notification.userId,
        type: 'push',
        notificationType: notification.type,
        title: notification.title,
        status: 'sent'
      });
    } catch (error) {
      console.error('Push notification error:', error);

      if (error.statusCode === 410) {
        await this.removeSubscription(subscription.endpoint);
      }
    }
  }

  // Send email notification
  async sendEmailNotification(email, notification) {
    try {
      const mailOptions = {
        from: `${process.env.SENDGRID_SENDER_NAME} <${process.env.SENDGRID_FROM_EMAIL}>`,
        to: email,
        subject: notification.title,
        html: notification.htmlContent || `
          <h2>${notification.title}</h2>
          <p>${notification.body}</p>
          <a href="${notification.url}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Details
          </a>
        `
      };

      await emailTransporter.sendMail(mailOptions);
      console.log('Email notification sent to:', email);

      await this.logNotification({
        email,
        type: 'email',
        notificationType: notification.type,
        title: notification.title,
        status: 'sent'
      });
    } catch (error) {
      console.error('Email notification error:', error);
    }
  }

  // Log notification
  async logNotification(data) {
    try {
      await getSupabase()
        .from('notification_logs')
        .insert({
          ...data,
          created_at: new Date()
        });
    } catch (error) {
      console.error('Notification logging error:', error);
    }
  }

  // Remove expired subscription
  async removeSubscription(endpoint) {
    try {
      await getSupabase()
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
    } catch (error) {
      console.error('Error removing subscription:', error);
    }
  }
}

export default new NotificationService();
