import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Support both Vite (import.meta.env) and Node.js (process.env) environments
const getEnvVar = (key: string): string | undefined => {
  // Check if running in Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // Fall back to process.env for Node.js/CLI
  return process.env[key];
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Lazy initialization - only throw error when client is actually used
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    // Initialize client on first access
    if (!supabaseClient) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      }
      supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    }
    return (supabaseClient as any)[prop];
  }
});
