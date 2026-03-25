# 🚀 DEPLOYMENT GUIDE - PUSH NOTIFICATION SYSTEM

## 📋 REQUIRED ENVIRONMENT VARIABLES

### **🔧 Vercel Dashboard Settings**
The following environment variables must be set in the Vercel dashboard for the push notification system to work:

#### **Frontend Variables (Vercel Dashboard → Settings → Environment Variables):**
```
VITE_AGORA_APP_ID=your_agora_app_id
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://zero-effort-server.onrender.com/api
```

#### **Backend Variables (Vercel Dashboard → Settings → Environment Variables):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@zeroeffort.com
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@zeroeffort.com
SENDGRID_SENDER_NAME=ZERO EFFORT
NODE_ENV=production
PORT=3001
```

## 🔧 DATABASE SETUP

### **📊 Run Database Migration:**
The appointments table with reminder columns needs to be created in Supabase:

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/add_appointment_reminder_columns.sql

ALTER TABLE appointments 
ADD COLUMN reminder_24h_sent boolean DEFAULT false,
ADD COLUMN reminder_1h_sent boolean DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX idx_appointments_reminder_24h ON appointments(reminder_24h_sent) WHERE reminder_24h_sent = false;
CREATE INDEX idx_appointments_reminder_1h ON appointments(reminder_1h_sent) WHERE reminder_1h_sent = false;
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, appointment_time);
```

## 🚀 DEPLOYMENT STEPS

### **1. Set Environment Variables**
- Copy variables from `.env.server.example` to your deployment platform
- Update with your actual Supabase credentials
- Update with your Agora credentials
- Update with your VAPID keys

### **2. Deploy Frontend**
- Push latest changes to Vercel
- Verify all environment variables are set correctly

### **3. Deploy Backend**
- Push latest changes to Render.com
- Verify all environment variables are set correctly
- Check that server starts successfully

### **4. Verify Functionality**
- Test message push notifications
- Test video call notifications  
- Test appointment reminders
- Check server logs for appointment reminder scheduler

## 🔍 TROUBLESHOOTING

### **Common Issues:**

#### **Server Fails to Start:**
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend environment
- Verify all required environment variables are set
- Check server logs for specific error messages

#### **Push Notifications Not Working:**
- Verify VAPID keys are correctly set in both frontend and backend
- Check browser notification permissions
- Verify server is running and accessible

#### **Appointment Reminders Not Working:**
- Verify database migration was run
- Check server logs for cron job execution
- Verify reminder columns exist in appointments table

#### **Build Errors:**
- Check for syntax errors in JavaScript/JSX files
- Verify all imports are correct
- Run `npm run build` locally to test

## 📱 TESTING CHECKLIST

### **✅ Message Notifications:**
- [ ] HR sends message to applicant
- [ ] Applicant receives push notification
- [ ] Applicant replies to HR
- [ ] HR receives push notification
- [ ] Both parties can see real-time updates

### **✅ Video Call Notifications:**
- [ ] HR initiates video call
- [ ] Applicant receives push notification
- [ ] Direct link works to join call

### **✅ Appointment Reminders:**
- [ ] 24-hour reminder sent before appointment
- [ ] 1-hour reminder sent before appointment
- [ ] Reminder flags updated in database
- [ ] Server logs show scheduler running

### **✅ Error Handling:**
- [ ] Push failures don't crash main application
- [ ] Error logs are properly captured
- [ ] Email fallback still works

## 🎯 SUPPORT

If you encounter deployment issues:
1. Check environment variables are set correctly
2. Verify database migrations are applied
3. Check server logs for specific error messages
4. Test functionality in development first

**📱 The push notification system is designed to be robust with proper error handling and fallback mechanisms!**
