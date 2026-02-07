
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Anon Key are not set.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
