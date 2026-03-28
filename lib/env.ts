/**
 * Environment variable validation.
 *
 * Import this module early (e.g. in layout.tsx or next.config) to surface
 * missing configuration at startup rather than at request time.
 *
 * - Required variables cause a thrown error.
 * - Optional variables log a console.warn.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
      `The application cannot start without it.`
    )
  }
  return value
}

function warnEnv(name: string): string | undefined {
  const value = process.env[name]
  if (!value) {
    console.warn(
      `[env] Warning: environment variable ${name} is not set. ` +
      `Some features may be unavailable.`
    )
  }
  return value
}

// ---------------------------------------------------------------------------
// Required
// ---------------------------------------------------------------------------
export const NEXT_PUBLIC_SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

// ---------------------------------------------------------------------------
// Optional (warn if missing)
// ---------------------------------------------------------------------------
export const ANTHROPIC_API_KEY = warnEnv('ANTHROPIC_API_KEY')
export const SUPABASE_SERVICE_ROLE_KEY = warnEnv('SUPABASE_SERVICE_ROLE_KEY')
export const STRIPE_SECRET_KEY = warnEnv('STRIPE_SECRET_KEY')
