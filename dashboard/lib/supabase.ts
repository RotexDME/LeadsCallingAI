import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface Contact {
  id?: string;
  phone_number: string;
  name?: string;
  email?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Call {
  id?: string;
  contact_id?: string;
  phone_number: string;
  room_name: string;
  sip_call_id?: string;
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'no_answer';
  direction: 'outbound' | 'inbound';
  prompt?: string;
  model_provider?: string;
  voice_id?: string;
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface CallTranscript {
  id?: string;
  call_id: string;
  speaker: 'ai' | 'user';
  message: string;
  timestamp?: string;
  sequence: number;
  created_at?: string;
}

export interface CallAnalytics {
  id?: string;
  call_id: string;
  sentiment_score?: number;
  user_satisfaction?: number;
  transfer_occurred?: boolean;
  functions_called?: any[];
  avg_response_time_ms?: number;
  created_at?: string;
}
