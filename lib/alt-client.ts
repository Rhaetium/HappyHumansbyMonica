// Côté navigateur : demande à /api/cms/alt-suggest une description de l'image. Ne lève jamais d'erreur :
// en cas d'échec (pas de clé Gemini, image illisible, réseau), renvoie { alt: '', error } et l'éditeur continue sans suggestion.

export async function suggestAlt(imageUrl: string, context?: string): Promise<{ alt: string; error?: string }> {
  try {
    const res = await fetch('/api/cms/alt-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, context }),
      signal: AbortSignal.timeout(25_000),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.success && typeof data.alt === 'string') return { alt: data.alt }
    return { alt: '', error: typeof data.error === 'string' ? data.error : 'Suggestion indisponible.' }
  } catch {
    return { alt: '', error: 'Suggestion indisponible (réseau).' }
  }
}
