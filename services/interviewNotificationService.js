import notificationService from './notificationService.js';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

// Get Supabase client (lazy initialization)
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

class InterviewNotificationService {
  async notifyInterviewScheduled(interview) {
    try {
      // Get applicant profile
      const { data: applicant } = await getSupabase()
        .from('applicants')
        .select('*')
        .eq('id', interview.applicant_id)
        .single();

      // Get company profile
      const { data: company } = await getSupabase()
        .from('companies')
        .select('*')
        .eq('id', interview.company_id)
        .single();

      const scheduledTime = new Date(interview.scheduled_at);
      const formattedTime = scheduledTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Notify applicant via push notification
      const { data: subscription } = await getSupabase()
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', applicant.id)
        .single();

      if (subscription) {
        await notificationService.sendPushNotification(
          subscription.subscription,
          {
            title: `Interview Scheduled with ${company.name}`,
            body: `Your interview is scheduled for ${formattedTime}`,
            type: 'interview_scheduled',
            interviewId: interview.id,
            userId: applicant.id,
            url: `/applicant/interviews/${interview.id}`,
            icon: '/logo-192x192.png'
          }
        );
      }

      // Also send email
      await notificationService.sendEmailNotification(applicant.email, {
        title: `Interview Scheduled with ${company.name}`,
        body: `Your interview is scheduled for ${formattedTime}`,
        htmlContent: `
          <h2>Interview Scheduled</h2>
          <p>You have an interview scheduled with <strong>${company.name}</strong></p>
          <p><strong>Date & Time:</strong> ${formattedTime}</p>
          <p><strong>Position:</strong> ${interview.position || 'TBD'}</p>
          <a href="https://zeroeffort.com/applicant/interviews/${interview.id}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Interview Details
          </a>
        `,
        type: 'interview_scheduled',
        url: `https://zeroeffort.com/applicant/interviews/${interview.id}` 
      });

      console.log('Interview scheduled notifications sent');
    } catch (error) {
      console.error('Error sending interview scheduled notification:', error);
    }
  }

  setupReminderScheduler() {
    // Check every minute for upcoming interviews
    cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        const { data: upcomingInterviews } = await getSupabase()
          .from('interviews')
          .select('*')
          .gte('scheduled_at', now.toISOString())
          .lte('scheduled_at', oneHourLater.toISOString())
          .eq('status', 'scheduled');

        if (upcomingInterviews) {
          for (const interview of upcomingInterviews) {
            const scheduledTime = new Date(interview.scheduled_at);
            const diffMs = scheduledTime - now;
            const diffMin = Math.round(diffMs / 60000);

            // Send reminders at 1 hour, 15 min, and 5 min before
            if ((diffMin > 55 && diffMin <= 60) || 
                (diffMin > 10 && diffMin <= 15) || 
                (diffMin > 0 && diffMin <= 5)) {
              await this.notifyInterviewReminder(interview, diffMin);
            }
          }
        }
      } catch (error) {
        console.error('Reminder scheduler error:', error);
      }
    });

    console.log('Interview reminder scheduler started');
  }

  async notifyInterviewReminder(interview, minutesBefore) {
    try {
      const { data: applicant } = await getSupabase()
        .from('applicants')
        .select('*')
        .eq('id', interview.applicant_id)
        .single();

      const reminderText = minutesBefore === 60 ? '1 hour' : `${minutesBefore} minutes`;

      const { data: subscription } = await getSupabase()
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', applicant.id)
        .single();

      if (subscription) {
        await notificationService.sendPushNotification(
          subscription.subscription,
          {
            title: `Reminder: Interview in ${reminderText}`,
            body: `Your interview is starting in ${reminderText}`,
            type: 'interview_reminder',
            interviewId: interview.id,
            userId: applicant.id,
            url: `/applicant/interviews/${interview.id}`,
            icon: '/logo-192x192.png',
            requireInteraction: true
          }
        );
      }

      console.log(`Interview reminder (${minutesBefore}min) sent`);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }
}

export default new InterviewNotificationService();
