import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import busboy from 'busboy';
import sharp from 'sharp';
import webpush from 'web-push';

// Load environment variables first
dotenv.config()

// Import new routes and services
import agoraRoutes from './routes/agoraRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import interviewNotificationService from './services/interviewNotificationService.js';

console.log('SUPABASE_URL loaded:', process.env.SUPABASE_URL ? 'YES' : 'NO')
console.log('Service role key loaded:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO - CHECK .env FILE')

const app = express()
app.use(cors())
app.use(express.json())

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Create any auth account (admin or company)
app.post('/api/create-account', async (req, res) => {
  const { email, password, metadata } = req.body
  console.log('Create account request:', { email, passwordLength: password?.length, metadata })
  
  // Backend password validation
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' })
  }
  
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 uppercase letter' })
  }
  
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 lowercase letter' })
  }
  
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 number' })
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 special character' })
  }
  
  try {
    // Check if this is an applicant account (based on metadata structure)
    const isApplicant = metadata && (metadata.first_name || metadata.last_name)
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: !isApplicant, // Don't auto-confirm for applicants
      user_metadata: metadata || {}
    })
    if (error) {
      console.error('Supabase createUser error:', error)
      
      // If user already exists, update instead of create
      if (error?.code === 'email_exists') {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers.users.find(u => u.email === email)
        
        if (existingUser) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { 
            password,
            user_metadata: metadata 
          })
          return res.json({ success: true, user: { id: existingUser.id } })
        }
      }
      
      return res.status(400).json({ error: error.message })
    }
    console.log('User created successfully:', data.user?.id)
    return res.json({ success: true, user: { id: data.user.id } })
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// Delete auth account
app.post('/api/delete-account', async (req, res) => {
  const { userId } = req.body
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// Get user by email (for admin deletion)
app.post('/api/get-user-by-email', async (req, res) => {
  const { email } = req.body
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) return res.status(400).json({ error: error.message })
    
    const user = data.users.find(u => u.email === email)
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    return res.json({ success: true, user })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body
  console.log('Reset password request:', { email, passwordLength: newPassword?.length })
  
  // Backend password validation for reset
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' })
  }
  
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 uppercase letter' })
  }
  
  if (!/[a-z]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 lowercase letter' })
  }
  
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 number' })
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 special character' })
  }
  
  try {
    // Find user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('List users error:', listError)
      return res.status(400).json({ error: listError.message })
    }
    
    const user = users.users.find(u => u.email === email)
    if (!user) {
      console.log('User not found for email:', email)
      return res.status(404).json({ error: 'User not found' })
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    })
    if (updateError) {
      console.error('Update password error:', updateError)
      return res.status(400).json({ error: updateError.message })
    }

    // Mark request as resolved
    const { error: markError } = await supabaseAdmin
      .from('password_reset_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('email', email)
      .eq('status', 'pending')
    
    if (markError) {
      console.error('Mark request resolved error:', markError)
      // Don't fail the request, just log the error
    }

    console.log('Password reset successfully for user:', user.id)
    return res.json({ success: true })
  } catch (err) {
    console.error('Server error in reset password:', err)
    return res.status(500).json({ error: err.message })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, system } = req.body
    console.log('=== CHAT API CALLED ===')
    console.log('GROQ_API_KEY loaded:', process.env.GROQ_API_KEY ? 'YES' : 'NO')
    console.log('Messages count:', messages?.length)

    const groqMessages = [
      { role: 'system', content: system },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ]

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}` 
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: groqMessages,
        max_tokens: 1000,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    console.log('Groq response status:', response.status)
    const data = await response.json()
    console.log('Groq data:', JSON.stringify(data).substring(0, 300))

    const text = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Please try again!"
    res.json({ content: [{ text }] })
  } catch (error) {
    console.error('Chat API error:', error.message)
    res.status(500).json({ error: 'Chat API error' })
  }
})

app.post('/api/send-message-notification', async (req, res) => {
  try {
    const { applicantEmail, applicantName, companyName, message } = req.body

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: applicantEmail
    })

    // Send email using Supabase
    const { error: emailError } = await supabaseAdmin
      .from('_email_queue')
      .insert({
        to: applicantEmail,
        subject: `New message from ${companyName} — Zero Effort`,
        html: `
          <h2>You have a new message from ${companyName}</h2>
          <p>Hi ${applicantName},</p>
          <p>${companyName} has sent you a message through Zero Effort:</p>
          <blockquote style="border-left: 4px solid #6366f1; padding-left: 16px; margin: 16px 0; color: #555;">
            ${message}
          </blockquote>
          <p>Log in to your Zero Effort account to reply:</p>
          <a href="https://zero-effort-app.onrender.com/jobs/inbox" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 8px;">
            View Inbox
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Zero Effort Job Portal</p>
        `
      })

    res.json({ success: true })
  } catch (error) {
    console.error('Email notification error:', error)
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

// Photo Validation Endpoint
app.post('/api/validate-photo', async (req, res) => {
  console.log('validate-photo called');
  try {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let fileSize = 0;

    bb.on('file', (name, file, info) => {
      const chunks = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
        fileSize += chunk.length;
      });
      file.on('close', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on('close', async () => {
      try {
        if (!fileBuffer) {
          return res.json({ valid: false, errors: ['No photo uploaded'] });
        }

        const errors = [];

        // Check 1: File size max 2MB
        if (fileSize > 2 * 1024 * 1024) {
          errors.push('Photo must be less than 2MB.');
        }

        // Check 2: White background
        const { data, info } = await sharp(fileBuffer)
          .resize(100, 100)
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const w = info.width;
        const h = info.height;

        let whiteCount = 0;
        let totalSampled = 0;

        for (let x = 0; x < w; x++) {
          const topIdx = (0 * w + x) * 3;
          if (data[topIdx] > 210 && data[topIdx+1] > 210 && data[topIdx+2] > 210) whiteCount++;
          totalSampled++;

          const botIdx = ((h-1) * w + x) * 3;
          if (data[botIdx] > 210 && data[botIdx+1] > 210 && data[botIdx+2] > 210) whiteCount++;
          totalSampled++;
        }

        for (let y = 1; y < h - 1; y++) {
          const leftIdx = (y * w + 0) * 3;
          if (data[leftIdx] > 210 && data[leftIdx+1] > 210 && data[leftIdx+2] > 210) whiteCount++;
          totalSampled++;

          const rightIdx = (y * w + (w-1)) * 3;
          if (data[rightIdx] > 210 && data[rightIdx+1] > 210 && data[rightIdx+2] > 210) whiteCount++;
          totalSampled++;
        }

        const whiteRatio = whiteCount / totalSampled;
        if (whiteRatio < 0.40) {
          errors.push(`Background must be plain white. Only ${Math.round(whiteRatio * 100)}% of the background is white.`);
        }

        // Check 3: Square ratio
        const metadata = await sharp(fileBuffer).metadata();
        const ratio = metadata.width / metadata.height;
        if (ratio < 0.85 || ratio > 1.15) {
          errors.push('Photo must be square (1:1 ratio).');
        }

        if (errors.length > 0) {
          return res.json({ valid: false, errors });
        }
        return res.json({ valid: true, message: 'Photo passed all validation checks.' });

      } catch (err) {
        console.error('Validation inner error:', err);
        return res.status(500).json({ valid: false, error: err.message });
      }
    });

    req.pipe(bb);
  } catch (err) {
    console.error('Validation error:', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// Save push subscription
app.post('/api/push/subscribe', async (req, res) => {
  const { user_id, user_type, subscription } = req.body;
  if (!user_id || !user_type || !subscription) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({ user_id, user_type, subscription }, { onConflict: 'user_id,user_type' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', JSON.stringify(err, null, 2));
    console.error('Push subscribe error message:', err.message);
    console.error('Push subscribe error details:', err.details);
    console.error('Push subscribe error hint:', err.hint);
    res.status(500).json({ error: err.message, details: err.details, hint: err.hint });
  }
});

// Send push notification
app.post('/api/push/send', async (req, res) => {
  const { user_id, user_type, title, body, url } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .eq('user_type', user_type)
      .maybeSingle();
    if (error || !data) return res.json({ success: false, reason: 'No subscription found' });

    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({ title, body, url })
    );
    res.json({ success: true });
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired, delete it
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user_id)
        .eq('user_type', user_type);
    }
    res.status(500).json({ error: err.message });
  }
});

// Add new routes for Agora and Notifications
app.use('/api/agora', agoraRoutes);
app.use('/api/notifications', notificationRoutes);

// Start interview reminder scheduler
interviewNotificationService.setupReminderScheduler();

const PORT = process.env.PORT || 3002
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin API server running on port ${PORT}`)
  console.log('✅ Agora video call service started')
  console.log('✅ Push notification service started')
  console.log('✅ Interview reminder scheduler started')
})
