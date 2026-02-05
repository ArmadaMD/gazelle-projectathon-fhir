import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SCHEMA_SQL = `
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_family_name ON patients(family_name);
CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON patients(birth_date);
CREATE INDEX IF NOT EXISTS idx_patients_health_card ON patients(health_card_number);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  action VARCHAR(20) NOT NULL,
  actor_id VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);
`;

async function setup() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    console.log('\\nTo use without Supabase, the server will run with in-memory storage.');
    process.exit(0);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('Setting up database schema...');
  console.log('\\nRun this SQL in Supabase SQL Editor:\\n');
  console.log(SCHEMA_SQL);

  console.log('\\n✅ Copy the SQL above to Supabase SQL Editor and run it.');
}

setup();
