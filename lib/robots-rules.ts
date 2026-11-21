// Règles du fichier /robots.txt, avec le choix « robots IA » modifiable dans le CMS (Paramètres → Robots IA).
// Fonction pure, testée dans __tests__/lib/robots-rules.test.ts.

/**
 * Robots d'IA qui répondent aux questions des internautes ou lisent une page à leur demande.
 * Les bloquer rend le site invisible dans les réponses de ChatGPT, Claude et Perplexity.
 */
export const AI_ANSWER_BOTS = [
  'OAI-SearchBot', 'ChatGPT-User',
  'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
]

/** Robots d'IA qui collectent des textes pour entraîner ou nourrir les modèles. */
export const AI_TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended']

export type RobotsRule = {
  userAgent: string | string[]
  allow?: string | string[]
  disallow?: string | string[]
}

/** Interrupteur du CMS : tout sauf « false » veut dire autorisé (comportement d'origine tant que rien n'est réglé). */
export const isAllowed = (value: string | undefined): boolean => value !== 'false'

/**
 * @param disallow chemins interdits à tous les robots (admin, API, pages masquées à Google…)
 * @param kv       réglages du CMS : `ai_search_bots` et `ai_training_bots` ('false' = bloqué)
 */
export function buildRobotsRules(disallow: string[], kv: Record<string, string | undefined>): RobotsRule[] {
  const rules: RobotsRule[] = [{ userAgent: '*', allow: '/', disallow }]
  const groups = [
    { bots: AI_ANSWER_BOTS, allowed: isAllowed(kv.ai_search_bots) },
    { bots: AI_TRAINING_BOTS, allowed: isAllowed(kv.ai_training_bots) },
  ]
  for (const g of groups) {
    // Un groupe dédié ne fusionne pas avec « * » : on y répète les interdictions.
    rules.push(g.allowed ? { userAgent: g.bots, allow: ['/', '/llms.txt'], disallow } : { userAgent: g.bots, disallow: '/' })
  }
  return rules
}
