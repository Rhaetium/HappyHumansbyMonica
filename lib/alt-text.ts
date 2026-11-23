// Texte alternatif (« alt ») d'une image, proposé par l'IA qui REGARDE l'image : utile à Google, aux assistants IA et aux
// personnes qui ne voient pas l'image. Monica relit toujours avant d'enregistrer. Logique pure, testée dans
// __tests__/lib/alt-text.test.ts.

export const ALT_MAX_CHARS = 125

export const ALT_SYSTEM = `Tu écris le texte alternatif (attribut « alt ») d'images pour le site de Monica Schneider (coaching, bien-être, relations, accompagnement des équipes).
Décris ce qu'on voit réellement, en une seule phrase courte en français (100 caractères environ, 125 au plus) : sujet, action, lieu ou ambiance si visibles.
Pas de « image de », « photo de » ni de guillemets. Ne devine pas de noms de personnes, d'émotions certaines, de lieux précis ni de marques. S'il y a du texte lisible dans l'image, reprends l'essentiel.
Réponds uniquement par la description, sans rien d'autre.`

export function buildAltPrompt(context?: string): string {
  const c = (context ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
  return c ? `Décris cette image. Contexte de la page (pour choisir les mots justes, sans le recopier) : « ${c} ».` : 'Décris cette image.'
}

/** Nettoie la réponse : une ligne, sans guillemets ni préfixe « Image de », coupée au dernier mot avant la limite. */
export function cleanAlt(raw: string): string {
  let t = raw.split('\n').map(l => l.trim()).find(Boolean) ?? ''
  t = t.replace(/^(texte alternatif|alt)\s*:\s*/i, '')
    .replace(/^["«“'`\s]+|["»”'`\s]+$/g, '')
    .replace(/^(une? )?(image|photo|photographie|illustration)\s+(de |d['’]|montrant |représentant )/i, '')
    .replace(/\s+/g, ' ').trim()
  if (t) t = t[0].toUpperCase() + t.slice(1)
  if (t.length <= ALT_MAX_CHARS) return t.replace(/[\s,;:\-–—]+$/, '')
  const cut = t.slice(0, ALT_MAX_CHARS + 1)
  const space = cut.lastIndexOf(' ')
  return (space > ALT_MAX_CHARS * 0.6 ? cut.slice(0, space) : t.slice(0, ALT_MAX_CHARS)).replace(/[\s,;:\-–—.]+$/, '')
}
