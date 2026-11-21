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

/**
 * Titre et description du site par défaut (balises <title> et description, /llms.txt).
 * Le CMS (⚙️ Paramètres → 🔍 SEO global) les remplace ; ces valeurs ne servent que de secours.
 */
export const DEFAULT_SITE_TITLE = 'Happy Humans — Coaching & philo-coaching, Monica Schneider'
export const DEFAULT_SITE_DESCRIPTION =
  "Executive coaching, philo-coaching et sparring partner avec Monica Schneider, pour particuliers et entreprises. Retrouvez clarté, alignement et relations."

/** Nom de la marque, ajouté à la fin de chaque titre de page (« Contact | Happy Humans »). */
export const BRAND_NAME = 'Happy Humans'

/**
 * Titre de page sans la marque en fin de titre. Le gabarit du site ajoute déjà « | Happy Humans » :
 * un titre saisi « Contact — Monica Schneider · Happy Humans » donnerait « … · Happy Humans | Happy Humans ».
 * Retire donc un « Happy Humans » final précédé d'un séparateur (— – - · | :).
 */
export function stripBrandSuffix(title: string | null | undefined): string {
  const t = (title ?? '').trim()
  const stripped = t.replace(new RegExp(`\\s*[—–\\-·|:]\\s*${BRAND_NAME}\\s*$`, 'i'), '').trim()
  return stripped || t
}

/** Langues déclarées par défaut dans les données structurées (réglage CMS : Paramètres → Géo & Business). */
export const DEFAULT_LANGUAGES = ['fr', 'en', 'ro']

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'French', en: 'English', ro: 'Romanian', de: 'German', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ar: 'Arabic',
}

/**
 * Codes de langue saisis dans le CMS (« fr, en, ro, de, es ») : minuscules, deux lettres, sans doublon, douze au plus.
 * Une entrée invalide est ignorée ; une saisie vide ou sans aucun code valide retombe sur les langues par défaut.
 */
export function parseLanguages(value: string | null | undefined): string[] {
  const codes = [...new Set(
    (value ?? '')
      .split(/[,;\s]+/)
      .map(c => c.trim().toLowerCase())
      .filter(c => /^[a-z]{2}$/.test(c)),
  )].slice(0, 12)
  return codes.length > 0 ? codes : DEFAULT_LANGUAGES
}

/** Noms anglais des langues, pour schema.org `availableLanguage` ; un code inconnu reste tel quel. */
export function languageNames(codes: string[]): string[] {
  return codes.map(c => LANGUAGE_NAMES[c] ?? c)
}
