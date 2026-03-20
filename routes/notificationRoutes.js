import express from 'express';
import { createClient } from '@supabase/supabase-js';
import notificationService from '../services/notificationService.js';
import interviewNotificationService from '../services/interviewNotificationService.js';

const router = express.Router();

// Get Supabase client (lazy initialization)
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Simple auth middleware
const verifyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  req.userId = token; // This should be the actual user ID after verification
  next();
};

// Subscribe to push notifications
router.post('/subscribe', verifyAuth, async (req, res) => {
  try {
    const { subscription, userId } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const { error } = await getSupabase()
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId || req.userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          subscription: subscription,
          active: true
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;

    res.json({ success: true, message: 'Subscribed to notifications' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notification preferences
router.get('/settings/:userId', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await getSupabase()
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json(data || {
      user_id: userId,
      push_enabled: true,
      email_enabled: true,
      interview_scheduled: true,
      interview_reminder: true,
      interview_starting: true,
      hr_contact: true
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update notification preferences
router.post('/settings', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const settings = req.body;

    const { error } = await getSupabase()
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          ...settings,
          updated_at: new Date()
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test push notification
router.post('/test', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's subscription
    const { data: subscription } = await getSupabase()
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Send test notification
    await notificationService.sendPushNotification(
      subscription.subscription,
      {
        title: 'Test Notification',
        body: 'This is a test notification from ZERO EFFORT',
        type: 'test',
        userId: userId,
        url: '/dashboard',
        icon: '/logo-192x192.png'
      }
    );

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Interview scheduled notification
router.post('/interview-scheduled', verifyAuth, async (req, res) => {
  try {
    const { interviewId } = req.body;

    // Get interview details
    const { data: interview } = await getSupabase()
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Send notification
    await interviewNotificationService.notifyInterviewScheduled(interview);

    res.json({ success: true, message: 'Interview notification sent' });
  } catch (error) {
    console.error('Interview notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
