import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxbhqfjeijbqmguewxer.supabase.co'
const supabaseAnonKey = 'sb_publishable_HuYAaEimtaUGHfr9c9dzIA_IgOncyaT'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
