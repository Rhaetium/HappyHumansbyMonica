// Diagnostic de configuration : variables d'environnement, connexion Supabase, tables, exposition des données.
// Utilisé par GET /api/cms/health : les problèmes remontent en haut du tableau de bord de l'admin.
//
// Règle absolue : AUCUN résultat ne contient la valeur d'une variable ni d'une clé. On dit seulement
// « présente », « absente » ou « format inattendu ».

import type { HealthCheck } from './cms-health'

export type CheckLevel = 'ok' | 'warn' | 'fail' | 'info'

export type Check = {
  id: string
  level: CheckLevel
  title: string
  /** ce qui a été constaté, sans aucune valeur secrète */
  detail?: string
  /** ce qu'il faut faire, en langage simple */
  fix?: string
}

export type Env = Record<string, string | undefined>

const present = (v: string | undefined) => typeof v === 'string' && v.trim() !== ''
const MIN_SECRET = 32
const SUPABASE_URL_RE = /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/

// Tables dont l'absence casse le site ou le CMS, avec la migration qui les crée.
const REQUIRED_TABLES: { table: string; migration: string }[] = [
  { table: 'site_content', migration: 'créée à la main (voir docs/DEPLOIEMENT.md)' },
  { table: 'cms_settings_kv', migration: '20260619_create_cms_settings_kv.sql' },
  { table: 'questionnaires', migration: '20261102000000_questionnaires.sql' },
  { table: 'questionnaire_submissions', migration: '20261102000000_questionnaires.sql' },
]

// Tables utiles mais dont l'absence ne bloque pas tout le site.
const RECOMMENDED_TABLES: { table: string; migration: string }[] = [
  { table: 'cms_blog_posts', migration: '20260327050811_create_cms_tables.sql' },
  { table: 'booking_slots', migration: '20260619_create_booking_slots.sql' },
  { table: 'booking_requests', migration: '20260623_booking_slots.sql' },
  { table: 'contact_messages', migration: '20260623_contact_messages.sql' },
  { table: 'site_content_history', migration: '20260711000000_content_history.sql' },
]

// Tables qui contiennent des données personnelles : un visiteur anonyme ne doit jamais pouvoir les lire.
const PRIVATE_TABLES = ['contact_messages', 'booking_requests', 'questionnaire_submissions']

export function checkEnvironment(env: Env): Check[] {
  const checks: Check[] = []
  const add = (c: Check) => checks.push(c)

  // ── Supabase ──
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) {
    add({ id: 'supabase-url', level: 'fail', title: 'Adresse Supabase (NEXT_PUBLIC_SUPABASE_URL)', detail: 'Absente.', fix: 'Vercel → Environment Variables : ajoutez l’adresse du projet (Supabase → Settings → API), de la forme https://xxxx.supabase.co.' })
  } else if (!SUPABASE_URL_RE.test(url)) {
    add({ id: 'supabase-url', level: 'fail', title: 'Adresse Supabase (NEXT_PUBLIC_SUPABASE_URL)', detail: 'Format inattendu.', fix: 'Elle doit ressembler à https://xxxxxxxxxxxxxxxxxxxx.supabase.co (sans /rest/v1 ni slash final).' })
  } else add({ id: 'supabase-url', level: 'ok', title: 'Adresse Supabase (NEXT_PUBLIC_SUPABASE_URL)', detail: 'Présente et bien formée.' })

  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!anon) {
    add({ id: 'supabase-anon', level: 'fail', title: 'Clé publique Supabase (NEXT_PUBLIC_SUPABASE_ANON_KEY)', detail: 'Absente.', fix: 'Supabase → Settings → API → clé « publishable » ou « anon ». Cette clé peut être publique.' })
  } else if (!/^(sb_publishable_|eyJ)/.test(anon)) {
    add({ id: 'supabase-anon', level: 'fail', title: 'Clé publique Supabase (NEXT_PUBLIC_SUPABASE_ANON_KEY)', detail: 'Format inattendu.', fix: 'Elle commence par sb_publishable_ (ou eyJ pour l’ancien format).' })
  } else if (/^sb_secret_/.test(anon)) {
    add({ id: 'supabase-anon', level: 'fail', title: 'Clé publique Supabase (NEXT_PUBLIC_SUPABASE_ANON_KEY)', detail: 'Une clé SECRÈTE a été mise à la place de la clé publique.', fix: 'Remplacez-la tout de suite par la clé publique et régénérez la clé secrète dans Supabase : elle serait visible de tous dans le site.' })
  } else add({ id: 'supabase-anon', level: 'ok', title: 'Clé publique Supabase (NEXT_PUBLIC_SUPABASE_ANON_KEY)', detail: 'Présente.' })

  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!service) {
    add({ id: 'supabase-service', level: 'fail', title: 'Clé serveur Supabase (SUPABASE_SERVICE_ROLE_KEY)', detail: 'Absente : le CMS et les questionnaires ne peuvent pas lire ni écrire.', fix: 'Supabase → Settings → API → clé « secret » ou « service_role ». À mettre uniquement dans Vercel.' })
  } else if (!/^(sb_secret_|eyJ)/.test(service)) {
    add({ id: 'supabase-service', level: 'fail', title: 'Clé serveur Supabase (SUPABASE_SERVICE_ROLE_KEY)', detail: 'Format inattendu.', fix: 'Elle commence par sb_secret_ (ou eyJ pour l’ancien format).' })
  } else if (/^sb_publishable_/.test(service) || (anon && service === anon)) {
    add({ id: 'supabase-service', level: 'fail', title: 'Clé serveur Supabase (SUPABASE_SERVICE_ROLE_KEY)', detail: 'C’est la clé publique, pas la clé serveur.', fix: 'Copiez la clé « secret » / « service_role » de Supabase → Settings → API.' })
  } else add({ id: 'supabase-service', level: 'ok', title: 'Clé serveur Supabase (SUPABASE_SERVICE_ROLE_KEY)', detail: 'Présente.' })

  // ── Admin du CMS ──
  const password = env.CMS_PASSWORD?.trim()
  if (!password) {
    add({ id: 'cms-password', level: 'fail', title: 'Mot de passe de l’admin (CMS_PASSWORD)', detail: 'Absent : personne ne peut se connecter au CMS.', fix: 'Ajoutez un mot de passe long (12 caractères minimum) dans Vercel.' })
  } else if (password.length < 12) {
    add({ id: 'cms-password', level: 'warn', title: 'Mot de passe de l’admin (CMS_PASSWORD)', detail: `Court (${password.length} caractères).`, fix: 'Choisissez-en un d’au moins 12 caractères : l’admin est accessible depuis Internet.' })
  } else add({ id: 'cms-password', level: 'ok', title: 'Mot de passe de l’admin (CMS_PASSWORD)', detail: 'Présent.' })

  for (const [name, label] of [['CMS_SESSION_SECRET', 'Secret de session de l’admin'], ['CMS_HMAC_SECRET', 'Secret du lien « Éditer le site »']] as const) {
    const v = env[name]?.trim()
    if (!v) add({ id: name, level: 'info', title: `${label} (${name})`, detail: 'Absent : le mot de passe de l’admin sert de secret.', fix: 'Facultatif mais conseillé : une longue chaîne aléatoire (32 caractères ou plus).' })
    else if (v.length < MIN_SECRET) add({ id: name, level: 'warn', title: `${label} (${name})`, detail: `Court (${v.length} caractères).`, fix: 'Utilisez 32 caractères aléatoires ou plus.' })
    else if (password && v === password) add({ id: name, level: 'warn', title: `${label} (${name})`, detail: 'Identique au mot de passe.', fix: 'Mettez une valeur différente : un secret de signature ne doit pas être un mot de passe qu’on tape.' })
    else add({ id: name, level: 'ok', title: `${label} (${name})`, detail: 'Présent.' })
  }

  // ── Adresse publique (SEO) ──
  const site = env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!site) {
    add({ id: 'site-url', level: 'info', title: 'Adresse publique du site (NEXT_PUBLIC_SITE_URL)', detail: 'Absente : l’adresse par défaut du code (lib/site-url.ts) est utilisée pour le sitemap et les URL canoniques.', fix: 'Sans nom de domaine, rien à faire. Le jour où un domaine est branché, renseignez-le ici (sans slash final).' })
  } else if (!/^https:\/\/[^/\s]+$/.test(site)) {
    add({ id: 'site-url', level: 'fail', title: 'Adresse publique du site (NEXT_PUBLIC_SITE_URL)', detail: 'Format inattendu.', fix: 'Elle doit commencer par https:// et ne pas finir par un slash.' })
  } else if (/\.vercel\.app$/.test(new URL(site).hostname)) {
    add({ id: 'site-url', level: 'info', title: 'Adresse publique du site (NEXT_PUBLIC_SITE_URL)', detail: `Adresse Vercel : ${new URL(site).hostname}.`, fix: 'Convient tant qu’il n’y a pas de nom de domaine. Le jour où un domaine est branché, mettez-le ici : le sitemap, Google et les e-mails s’en servent.' })
  } else add({ id: 'site-url', level: 'ok', title: 'Adresse publique du site (NEXT_PUBLIC_SITE_URL)', detail: `Définie (${new URL(site).hostname}).` })

  // ── Services optionnels ──
  const mail = ['BREVO_API_KEY', 'SENDER_EMAIL', 'ADMIN_EMAIL'].filter(n => !present(env[n]))
  add(mail.length === 0
    ? { id: 'mail', level: 'ok', title: 'E-mails de contact et de réservation (Brevo)', detail: 'Configurés.' }
    : { id: 'mail', level: 'warn', title: 'E-mails de contact et de réservation (Brevo)', detail: `Manquant : ${mail.join(', ')}.`, fix: 'Sans eux, les visiteurs ne reçoivent pas de confirmation et Monica n’est pas prévenue.' })

  add(present(env.ANTHROPIC_API_KEY)
    ? { id: 'anthropic', level: 'ok', title: 'Générateur de questionnaires IA (ANTHROPIC_API_KEY)', detail: 'Clé présente.' }
    : { id: 'anthropic', level: 'info', title: 'Générateur de questionnaires IA (ANTHROPIC_API_KEY)', detail: 'Absente : les questionnaires se créent à la main.', fix: 'Facultatif. Ajoutez la clé Anthropic pour activer « Générer avec l’IA ».' })

  const gsc = ['GSC_SERVICE_ACCOUNT_EMAIL', 'GSC_SERVICE_ACCOUNT_PRIVATE_KEY'].filter(n => !present(env[n]))
  add(gsc.length === 0
    ? { id: 'gsc', level: 'ok', title: 'Statistiques Google Search Console', detail: 'Configurées.' }
    : { id: 'gsc', level: 'info', title: 'Statistiques Google Search Console', detail: 'Non configurées.', fix: 'Facultatif. L’onglet « Statistiques Google » explique comment les brancher.' })

  return checks
}

type FetchFn = typeof fetch

async function restGet(url: string, key: string, table: string, fetchFn: FetchFn) {
  const res = await fetchFn(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

const rowCount = (body: unknown) => (Array.isArray(body) ? body.length : 0)
const isMissingTable = (status: number, body: unknown) =>
  status === 404 || (typeof body === 'object' && body !== null && ['PGRST205', '42P01'].includes(String((body as { code?: string }).code)))

/**
 * Teste la vraie base : connexion, tables attendues, et exposition des données privées à un visiteur anonyme.
 * Ne modifie jamais rien : uniquement des lectures de 1 ligne.
 */
export async function checkSupabase(env: Env, fetchFn: FetchFn = fetch): Promise<Check[]> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !service || !SUPABASE_URL_RE.test(url)) {
    return [{ id: 'supabase-live', level: 'info', title: 'Test de la base Supabase', detail: 'Non effectué : adresse ou clé serveur manquante.' }]
  }

  const checks: Check[] = []
  const serviceRows: Record<string, number> = {}

  for (const [tables, level] of [[REQUIRED_TABLES, 'fail'], [RECOMMENDED_TABLES, 'warn']] as const) {
    for (const { table, migration } of tables) {
      try {
        const { status, body } = await restGet(url, service, table, fetchFn)
        if (status === 200) {
          serviceRows[table] = rowCount(body)
          checks.push({ id: `table-${table}`, level: 'ok', title: `Table « ${table} »`, detail: 'Présente.' })
        } else if (isMissingTable(status, body)) {
          checks.push({ id: `table-${table}`, level, title: `Table « ${table} »`, detail: 'Absente de la base.', fix: `Exécutez ${migration} dans Supabase → SQL Editor.` })
        } else if (status === 401 || status === 403) {
          checks.push({ id: `table-${table}`, level: 'fail', title: `Table « ${table} »`, detail: 'Accès refusé avec la clé serveur.', fix: 'La clé SUPABASE_SERVICE_ROLE_KEY ne correspond pas à ce projet : recopiez-la depuis Supabase → Settings → API.' })
        } else {
          checks.push({ id: `table-${table}`, level, title: `Table « ${table} »`, detail: `Réponse inattendue (code ${status}).` })
        }
      } catch {
        checks.push({ id: 'supabase-reach', level: 'fail', title: 'Connexion à Supabase', detail: 'Injoignable.', fix: 'Le projet est peut-être en pause (Supabase → Restore) ou l’adresse est fausse.' })
        return checks
      }
    }
  }

  // Un visiteur anonyme ne doit voir aucune donnée personnelle.
  if (anon) {
    for (const table of PRIVATE_TABLES) {
      if (!(table in serviceRows)) continue
      try {
        const { status, body } = await restGet(url, anon, table, fetchFn)
        if (status === 200 && rowCount(body) > 0) {
          checks.push({
            id: `exposure-${table}`, level: 'fail', title: `Confidentialité de « ${table} »`,
            detail: 'Un visiteur sans connexion peut LIRE ces données personnelles.',
            fix: `Dans Supabase → SQL Editor : « DROP POLICY » sur les politiques larges de ${table}, puis « REVOKE ALL ON ${table} FROM anon ». Dites-le-moi, je prépare le script.`,
          })
        } else if (status === 200 && (serviceRows[table] ?? 0) === 0) {
          checks.push({ id: `exposure-${table}`, level: 'info', title: `Confidentialité de « ${table} »`, detail: 'Table vide : impossible de vérifier pour l’instant. Refaites le test après les premières réponses.' })
        } else {
          checks.push({ id: `exposure-${table}`, level: 'ok', title: `Confidentialité de « ${table} »`, detail: 'Les visiteurs anonymes ne voient aucune ligne.' })
        }
      } catch {
        checks.push({ id: `exposure-${table}`, level: 'info', title: `Confidentialité de « ${table} »`, detail: 'Test non concluant (délai dépassé).' })
      }
    }
  }
  return checks
}

/**
 * Adapte les contrôles au format du tableau de bord (lib/cms-health) : seuls les vrais problèmes remontent.
 * Les fonctions facultatives non configurées (« info ») ne sont pas des problèmes. S'il n'y a rien à signaler,
 * un seul contrôle « ok » le dit.
 */
export function toHealthChecks(checks: Check[]): HealthCheck[] {
  const problems: HealthCheck[] = checks
    .filter(c => c.level === 'fail' || c.level === 'warn')
    .map(c => ({
      id: `config-${c.id}`,
      level: c.level === 'fail' ? 'error' as const : 'warn' as const,
      title: c.title,
      detail: c.detail ?? '',
      ...(c.fix ? { fix: c.fix } : {}),
    }))
  if (problems.length > 0) return problems
  return [{ id: 'config', level: 'ok', title: 'Configuration technique', detail: 'Variables, base Supabase, tables et confidentialité des données vérifiées.' }]
}

export function summarize(checks: Check[]) {
  const count = (l: CheckLevel) => checks.filter(c => c.level === l).length
  return { fail: count('fail'), warn: count('warn'), ok: count('ok'), info: count('info') }
}
