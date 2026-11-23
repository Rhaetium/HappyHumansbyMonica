// Validation des champs de l'éditeur de pages, façon Sanity : un message sous le champ concerné,
// les erreurs bloquent la publication, les avertissements sont signalés avant de publier.
// Fonctions pures, testées dans __tests__/lib/field-validation.test.ts. Rien n'est modifié ni refusé à la saisie :
// on ne contrôle qu'à l'affichage et à la publication.

export type FieldIssue = { level: 'error' | 'warning'; message: string }

export type FieldDef = { key: string; label: string; type: string }

/** Destinations de bouton acceptées : page du site, ancre, lien complet, e-mail ou téléphone. */
const HREF_OK = /^(\/(?!\/)\S*|#\S*|https?:\/\/\S+|mailto:\S+|tel:\+?[\d\s().-]+)$/i
const IMAGE_OK = /^(\/(?!\/)\S*|https?:\/\/\S+|data:image\/\S+)$/i
/** Passage du modèle resté tel quel : « [Réponse courte…] ». Un lien « [texte](https://…) » n'en est pas un. */
const PLACEHOLDER = /\[[^\]\n]{2,}\](?!\()/

export function validateField(def: FieldDef, rawValue: string | undefined): FieldIssue | null {
  const value = rawValue ?? ''
  // Une valeur vide, ou un simple espace (masquer un texte), est toujours acceptée : c'est le défaut ou un choix.
  if (value.trim() === '') return null

  if (def.key.endsWith('_href')) {
    if (!HREF_OK.test(value.trim())) {
      return { level: 'error', message: 'Destination invalide : saisissez une page du site (ex. /contact) ou un lien complet commençant par https://.' }
    }
    return null
  }

  if (def.type === 'image') {
    if (!IMAGE_OK.test(value.trim())) {
      return { level: 'error', message: 'Adresse d’image invalide : elle doit commencer par / ou https://.' }
    }
    return null
  }

  if (def.type === 'text' || def.type === 'textarea' || def.type === 'richtext') {
    if (PLACEHOLDER.test(value)) {
      return { level: 'warning', message: 'Un passage entre [crochets] n’a pas été remplacé : il serait visible par les visiteurs.' }
    }
  }
  return null
}

export type PageIssue = FieldIssue & { key: string; label: string }

/** Problèmes d'une page. `keys` limite le contrôle aux champs modifiés (ceux qu'on s'apprête à publier). */
export function validatePage(
  defs: FieldDef[],
  content: Record<string, string>,
  page: string,
  keys?: string[],
): PageIssue[] {
  const only = keys ? new Set(keys) : null
  const out: PageIssue[] = []
  for (const def of defs) {
    if (only && !only.has(def.key)) continue
    const issue = validateField(def, content[`${page}__${def.key}`])
    if (issue) out.push({ ...issue, key: def.key, label: def.label })
  }
  // Erreurs d'abord, pour que le message de blocage cite le plus grave.
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
}
