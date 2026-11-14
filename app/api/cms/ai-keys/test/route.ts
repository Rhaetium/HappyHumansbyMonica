import { NextRequest, NextResponse } from 'next/server'
import { requireCmsAuth } from '@/lib/cms-auth'
import { AiError, generateText, pickProvider } from '@/lib/ai-text'
import { loadAiEnv } from '@/lib/ai-keys'
import { providerById } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 25_000

// Bouton « Tester » : envoie une toute petite demande au fournisseur choisi, avec SA clé uniquement
// (Vercel ou admin), pour vérifier qu'elle fonctionne. Consomme un message du quota gratuit.
export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = (await req.json().catch(() => null)) as { provider?: string } | null
  const provider = providerById(String(body?.provider ?? ''))
  if (!provider) return NextResponse.json({ ok: false, error: 'Fournisseur inconnu.' }, { status: 400 })

  // Environnement limité à ce fournisseur : le test ne peut jamais retomber sur un autre.
  const all = await loadAiEnv()
  const only: Record<string, string | undefined> = { AI_PROVIDER: provider.id }
  for (const f of provider.fields) only[f.env] = all[f.env]
  if (pickProvider(only) !== provider.id) {
    return NextResponse.json({ ok: false, error: 'Ce fournisseur n’est pas encore configuré.' }, { status: 400 })
  }

  try {
    await Promise.race([
      generateText({ system: 'Réponds par un seul mot.', prompt: 'Dis « ok ».', maxTokens: 20 }, only),
      new Promise((_, reject) => setTimeout(() => reject(new AiError('Délai dépassé : le service ne répond pas.', 504)), TIMEOUT_MS)),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    // Les messages d'AiError sont rédigés pour être lus tels quels ; tout le reste reste générique.
    const message = e instanceof AiError ? e.message : 'Le test a échoué. Vérifiez la clé.'
    return NextResponse.json({ ok: false, error: message })
  }
}
