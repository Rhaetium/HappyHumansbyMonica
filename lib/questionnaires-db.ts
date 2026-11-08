// Accès base (côté serveur uniquement) aux tables questionnaires / questionnaire_submissions.
// Utilise la clé service_role : à n'importer que depuis les routes /api, jamais depuis un composant client.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getQuestionnaireDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export const DB_NOT_CONFIGURED = { error: 'Base de données non configurée.' } as const
