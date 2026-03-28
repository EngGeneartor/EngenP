import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rgwrfrturgqbopelalcq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Qk2bevLeqxNQHDMWbhGW1g_GdARMZ2R'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
