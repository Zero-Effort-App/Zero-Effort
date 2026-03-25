-- Create appointments table for scheduling video call appointments
CREATE TABLE appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES applicants(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_appointments_company_applicant ON appointments(company_id, applicant_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, appointment_time);

-- Add RLS (Row Level Security) policies
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Companies can view appointments for their applicants
CREATE POLICY "Companies can view their appointments" ON appointments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM company_users WHERE company_id = appointments.company_id
    )
  );

-- Policy: Applicants can view their own appointments
CREATE POLICY "Applicants can view their appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = applicant_id
  );

-- Policy: Companies can insert appointments for their applicants
CREATE POLICY "Companies can create appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM company_users WHERE company_id = appointments.company_id
    )
  );

-- Policy: Companies can update appointments for their applicants
CREATE POLICY "Companies can update appointments" ON appointments
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM company_users WHERE company_id = appointments.company_id
    )
  );

-- Policy: Applicants can update their own appointment status
CREATE POLICY "Applicants can update their appointments" ON appointments
  FOR UPDATE USING (
    auth.uid() = applicant_id AND status IN ('pending', 'confirmed', 'rejected')
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
