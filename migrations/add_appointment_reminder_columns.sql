-- Add reminder tracking columns to appointments table
ALTER TABLE appointments 
ADD COLUMN reminder_24h_sent boolean DEFAULT false,
ADD COLUMN reminder_1h_sent boolean DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX idx_appointments_reminder_24h ON appointments(reminder_24h_sent) WHERE reminder_24h_sent = false;
CREATE INDEX idx_appointments_reminder_1h ON appointments(reminder_1h_sent) WHERE reminder_1h_sent = false;
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, appointment_time);
