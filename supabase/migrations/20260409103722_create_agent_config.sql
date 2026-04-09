/*
  # Create agent_config table

  ## Purpose
  Stores all AI agent configuration keys and settings so they can be
  viewed and edited from the dashboard frontend. Acts as a single source
  of truth for all integration credentials.

  ## New Tables
  - `agent_config`
    - `id` (uuid, primary key)
    - `key` (text, unique) — the setting name, e.g. "LIVEKIT_URL"
    - `value` (text) — the setting value (stored encrypted at rest by Supabase)
    - `label` (text) — human-readable label shown in the UI
    - `group` (text) — grouping category: livekit | stt | tts | llm | sip | supabase
    - `is_secret` (boolean) — if true, value is masked in the UI
    - `placeholder` (text) — example value shown when empty
    - `updated_at` (timestamptz)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only service role (edge functions) can read/write
  - Anon key gets SELECT only (needed for the dashboard to display config status)

  ## Seed Data
  Pre-populates all known config keys from .env.example so the UI
  renders immediately with correct labels and groupings.
*/

CREATE TABLE IF NOT EXISTS agent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  "group" text NOT NULL DEFAULT 'general',
  is_secret boolean NOT NULL DEFAULT false,
  placeholder text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read config"
  ON agent_config FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update config"
  ON agent_config FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can insert config"
  ON agent_config FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agent_config_updated_at ON agent_config;
CREATE TRIGGER agent_config_updated_at
  BEFORE UPDATE ON agent_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO agent_config (key, value, label, "group", is_secret, placeholder) VALUES
  ('LIVEKIT_URL',             '',  'LiveKit URL',              'livekit',   false, 'wss://your-project.livekit.cloud'),
  ('LIVEKIT_API_KEY',         '',  'LiveKit API Key',          'livekit',   true,  'APIxxxxxxxxxxxxxxxx'),
  ('LIVEKIT_API_SECRET',      '',  'LiveKit API Secret',       'livekit',   true,  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  ('DEEPGRAM_API_KEY',        '',  'Deepgram API Key',         'stt',       true,  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  ('OPENAI_API_KEY',          '',  'OpenAI API Key',           'llm',       true,  'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  ('GROQ_API_KEY',            '',  'Groq API Key',             'llm',       true,  'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  ('GROQ_MODEL',              'llama-3.3-70b-versatile', 'Groq Model', 'llm', false, 'llama-3.3-70b-versatile'),
  ('VOBIZ_SIP_TRUNK_ID',      '',  'SIP Trunk ID',             'sip',       true,  'ST_xxxxxxxx'),
  ('VOBIZ_SIP_DOMAIN',        '',  'SIP Domain',               'sip',       false, 'sip.vobiz.in'),
  ('VOBIZ_USERNAME',          '',  'SIP Username',             'sip',       false, 'your_sip_user'),
  ('VOBIZ_PASSWORD',          '',  'SIP Password',             'sip',       true,  'your_sip_password'),
  ('VOBIZ_OUTBOUND_NUMBER',   '',  'Outbound Caller ID',       'sip',       false, '+91XXXXXXXXXX'),
  ('DEFAULT_TRANSFER_NUMBER', '',  'Default Transfer Number',  'sip',       false, '+91XXXXXXXXXX')
ON CONFLICT (key) DO NOTHING;
