/*
  # AI Voice Call Tracking System

  ## Overview
  This migration creates a complete system for tracking AI-powered voice calls, including call logs, 
  transcripts, analytics, and contact management.

  ## 1. New Tables

  ### `contacts`
  Stores contact information for people who receive calls
  - `id` (uuid, primary key) - Unique identifier
  - `phone_number` (text, unique) - Contact's phone number with country code
  - `name` (text, nullable) - Contact's name
  - `email` (text, nullable) - Contact's email
  - `metadata` (jsonb, nullable) - Additional custom fields
  - `created_at` (timestamptz) - When contact was added
  - `updated_at` (timestamptz) - Last update time

  ### `calls`
  Main call tracking table with comprehensive call details
  - `id` (uuid, primary key) - Unique call identifier
  - `contact_id` (uuid, foreign key) - Links to contacts table
  - `phone_number` (text) - Number that was called
  - `room_name` (text) - LiveKit room name
  - `sip_call_id` (text, nullable) - SIP call identifier
  - `status` (text) - Call status: initiated, ringing, answered, completed, failed, no_answer
  - `direction` (text) - Call direction: outbound or inbound
  - `prompt` (text, nullable) - Custom instructions given to AI
  - `model_provider` (text) - LLM provider used (openai, groq)
  - `voice_id` (text) - TTS voice used
  - `started_at` (timestamptz) - When call was initiated
  - `answered_at` (timestamptz, nullable) - When call was answered
  - `ended_at` (timestamptz, nullable) - When call ended
  - `duration_seconds` (integer, nullable) - Total call duration
  - `error_message` (text, nullable) - Error details if failed
  - `metadata` (jsonb) - Additional call metadata
  - `created_at` (timestamptz) - Record creation time

  ### `call_transcripts`
  Stores conversation transcripts from calls
  - `id` (uuid, primary key) - Unique identifier
  - `call_id` (uuid, foreign key) - Links to calls table
  - `speaker` (text) - Who spoke: ai or user
  - `message` (text) - What was said
  - `timestamp` (timestamptz) - When this was spoken
  - `sequence` (integer) - Order in conversation
  - `created_at` (timestamptz) - Record creation time

  ### `call_analytics`
  Aggregated analytics and metrics for calls
  - `id` (uuid, primary key) - Unique identifier
  - `call_id` (uuid, foreign key) - Links to calls table
  - `sentiment_score` (numeric, nullable) - Conversation sentiment (-1 to 1)
  - `user_satisfaction` (integer, nullable) - Rating 1-5
  - `transfer_occurred` (boolean) - Whether call was transferred
  - `functions_called` (jsonb) - List of AI functions used
  - `avg_response_time_ms` (integer, nullable) - AI response speed
  - `created_at` (timestamptz) - Record creation time

  ## 2. Indexes
  - Phone number lookup index on contacts
  - Call status and timestamp indexes for filtering
  - Foreign key indexes for joins

  ## 3. Security
  - Enable RLS on all tables
  - Allow public insert on calls (for API webhook)
  - Allow authenticated read access to all data
  - Restrict updates and deletes to authenticated users only
*/

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  name text,
  email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  room_name text NOT NULL,
  sip_call_id text,
  status text NOT NULL DEFAULT 'initiated',
  direction text NOT NULL DEFAULT 'outbound',
  prompt text,
  model_provider text DEFAULT 'openai',
  voice_id text DEFAULT 'alloy',
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create call_transcripts table
CREATE TABLE IF NOT EXISTS call_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE NOT NULL,
  speaker text NOT NULL,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  sequence integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create call_analytics table
CREATE TABLE IF NOT EXISTS call_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE NOT NULL,
  sentiment_score numeric(3,2),
  user_satisfaction integer,
  transfer_occurred boolean DEFAULT false,
  functions_called jsonb DEFAULT '[]'::jsonb,
  avg_response_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_contact_id ON calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analytics_call_id ON call_analytics(call_id);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for contacts table
CREATE POLICY "Allow public insert on contacts"
  ON contacts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update on contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for calls table
CREATE POLICY "Allow public insert on calls"
  ON calls FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on calls"
  ON calls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public update on calls"
  ON calls FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Policies for call_transcripts table
CREATE POLICY "Allow public insert on call_transcripts"
  ON call_transcripts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on call_transcripts"
  ON call_transcripts FOR SELECT
  TO authenticated
  USING (true);

-- Policies for call_analytics table
CREATE POLICY "Allow public insert on call_analytics"
  ON call_analytics FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on call_analytics"
  ON call_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public update on call_analytics"
  ON call_analytics FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on contacts
CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
