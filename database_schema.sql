-- ===== AGORA VIDEO CALL TABLES =====

-- Call Sessions Table
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  channel_name VARCHAR NOT NULL UNIQUE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  status VARCHAR DEFAULT 'active',
  recording_id VARCHAR,
  recording_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Participants Table
CREATE TABLE call_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_type VARCHAR NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  audio_enabled BOOLEAN DEFAULT TRUE,
  video_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Messages Table
CREATE TABLE call_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  message_type VARCHAR DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== PUSH NOTIFICATION TABLES =====

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR NOT NULL UNIQUE,
  p256dh VARCHAR NOT NULL,
  auth VARCHAR NOT NULL,
  subscription JSONB NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  interview_scheduled BOOLEAN DEFAULT TRUE,
  interview_reminder BOOLEAN DEFAULT TRUE,
  interview_starting BOOLEAN DEFAULT TRUE,
  hr_contact BOOLEAN DEFAULT TRUE,
  new_message BOOLEAN DEFAULT TRUE,
  status_changed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Logs
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR,
  phone VARCHAR,
  type VARCHAR NOT NULL,
  notification_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'sent',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== UPDATE INTERVIEWS TABLE =====
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS video_call_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agora_channel_name VARCHAR,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- ===== CREATE INDEXES =====
CREATE INDEX idx_call_sessions_interview_id ON call_sessions(interview_id);
CREATE INDEX idx_call_sessions_applicant_id ON call_sessions(applicant_id);
CREATE INDEX idx_call_sessions_recruiter_id ON call_sessions(recruiter_id);
CREATE INDEX idx_call_sessions_status ON call_sessions(status);
CREATE INDEX idx_call_participants_call_session_id ON call_participants(call_session_id);
CREATE INDEX idx_call_messages_call_session_id ON call_messages(call_session_id);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_type ON notification_logs(type);
