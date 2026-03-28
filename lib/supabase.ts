import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rgwrfrturgqbopelalcq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Qk2bevLeqxNQHDMWbhGW1g_GdARMZ2R'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
