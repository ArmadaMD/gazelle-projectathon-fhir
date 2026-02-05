import { createClient } from '@supabase/supabase-js';

let supabase = null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/**
 * Get or create Supabase client
 */
export function getSupabase() {
  if (!supabase && isSupabaseConfigured()) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return supabase;
}

/**
 * Database schema for Supabase
 * Run this SQL in Supabase SQL Editor to create the tables
 */
export const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  health_card_number VARCHAR(50),
  family_name VARCHAR(100) NOT NULL,
  given_name VARCHAR(100),
  gender VARCHAR(20),
  birth_date DATE,
  phone VARCHAR(20),
  email VARCHAR(255),
  address_line VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(10),
  postal_code VARCHAR(10),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common searches
CREATE INDEX IF NOT EXISTS idx_patients_family_name ON patients(family_name);
CREATE INDEX IF NOT EXISTS idx_patients_given_name ON patients(given_name);
CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON patients(birth_date);
CREATE INDEX IF NOT EXISTS idx_patients_health_card ON patients(health_card_number);

-- Audit log table (for HIPAA compliance)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  action VARCHAR(20) NOT NULL, -- create, read, update, delete
  actor_id VARCHAR(255),
  actor_type VARCHAR(50), -- client, user, system
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for patients table
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - enable for production
-- ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
`;

/**
 * Test database connection
 */
export async function testConnection() {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured - using in-memory storage');
    return false;
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('patients').select('id').limit(1);

    if (error && error.code === '42P01') {
      console.log('Database tables not created - run setup script');
      return false;
    }

    if (error) {
      console.error('Database connection error:', error);
      return false;
    }

    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    return false;
  }
}
