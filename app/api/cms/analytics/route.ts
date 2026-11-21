import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { getKvSettings } from '@/lib/cms-settings-server'
import { resolveFromEnvironment } from '@/lib/analytics-ids'

export const dynamic = 'force-dynamic'

// Identifiants Tag Manager / GA4 réellement utilisés par le site, et d'où ils viennent (admin, Vercel ou origine).
// Les identifiants ne sont pas des secrets (visibles dans le code des pages) ; la route reste réservée à l'admin.
export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError
  const kv = await getKvSettings()
  return NextResponse.json(
    { active: resolveFromEnvironment(kv, process.env), custom: { gtm_id: kv.gtm_id ?? '', ga_id: kv.ga_id ?? '' } },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
