/**
 * lib/types.ts
 *
 * Central type barrel.
 * All application types live in lib/types/index.ts.
 * This file re-exports everything so that both
 *   import type { … } from '@/lib/types'
 * and
 *   import type { … } from '@/lib/types/index'
 * resolve to the same definitions.
 */
export * from '@/lib/types/index'
