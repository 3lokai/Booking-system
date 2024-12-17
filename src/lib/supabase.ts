import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export type Slot = {
    id: string;
    time_slot: string;
    is_booked: boolean;
    booker_name: string | null;
    booker_email: string | null;
    account_name: string | null;
    created_at: string;
  };