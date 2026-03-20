-- Call Usage Tracking Table Migration
-- Creates table for tracking 30-minute call limits and 10,000 minute company quota

CREATE TABLE IF NOT EXISTS call_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL,
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  reason VARCHAR DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_call_usage_company_id ON call_usage_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_call_usage_created_at ON call_usage_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_call_usage_monthly ON call_usage_tracking(company_id, created_at);

-- Comments for documentation
COMMENT ON TABLE call_usage_tracking IS 'Tracks all video calls for 30-minute limits and company quota management';
COMMENT ON COLUMN call_usage_tracking.reason IS 'Call end reason: completed, user_ended, 30min_limit';
