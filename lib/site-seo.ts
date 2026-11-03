/**
 * Données de référencement structuré — valeurs de secours uniquement.
 *
 * La source réelle est le CMS : ⚙️ Paramètres → 🔍 SEO global (`seo_keywords`) et
 * 📍 Géo & Business (`geo_person_name`, `geo_person_job_title`). Ces valeurs alimentent les
 * métadonnées et le JSON-LD `Person` lus par Google ; elles ne doivent pas être recopiées ailleurs.
 */

/** Mots-clés par défaut (métadonnées `keywords`), séparés par des virgules dans le CMS. */
export const DEFAULT_SEO_KEYWORDS = [
  'executive coach',
  'coaching dirigeant',
  'philosophical counselling',
  'coaching leadership',
  'Monica Schneider',
  'Happy Humans',
  'coaching de carrière',
  'transformation équipes',
]

/** Nom de la personne (JSON-LD `Person`, auteur et créateur). */
export const DEFAULT_PERSON_NAME = 'Monica Schneider'

/** Fonction de la personne (JSON-LD `Person.jobTitle`). */
export const DEFAULT_PERSON_JOB_TITLE = 'Executive Coach'

/**
 * Découpe la saisie CMS en liste de mots-clés : séparateur virgule ou retour à la ligne,
 * espaces superflus retirés, entrées vides ignorées. Une saisie vide retombe sur les défauts.
 */
export function parseKeywords(value: string | null | undefined): string[] {
  const list = (value ?? '')
    .split(/[,\n]/)
    .map(k => k.trim())
    .filter(Boolean)
  return list.length > 0 ? list : DEFAULT_SEO_KEYWORDS
}
