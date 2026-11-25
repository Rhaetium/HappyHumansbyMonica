// Sauvegarde du contenu du CMS : lit les tables Supabase et écrit un fichier JSON par table dans le dossier donné.
// Sans dépendance (Node 20+ : fetch intégré). Lancé chaque nuit par .github/workflows/backup.yml vers un dépôt privé.
//
// Usage : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup-supabase.mjs <dossier-de-sortie>
//
// Les fichiers ne contiennent aucune date : seul un vrai changement du contenu produit un commit dans le dépôt de sauvegarde.
// Les valeurs secrètes (clés d'API chiffrées, préfixe « secret_ ») ne sont pas sauvegardées.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** table → colonnes de tri (un ordre stable est nécessaire pour paginer sans doublon ni trou). */
export const TABLES = {
  site_content: ['page', 'block_key'],
  site_content_history: ['id'],
  cms_settings_kv: ['key'],
  cms_settings: ['id'],
  cms_blog_posts: ['id'],
  cms_media: ['id'],
  booking_slots: ['id'],
  booking_requests: ['id'],
  contact_messages: ['id'],
  questionnaires: ['id'],
  questionnaire_submissions: ['id'],
}

export const PAGE_SIZE = 1000
export const REDACTED = '[secret non sauvegardé]'

/** Table absente de la base (jamais créée) : ce n'est pas une panne, on le note dans le manifeste. */
export const isMissingTable = (status, body) =>
  status === 404 || /PGRST205|42P01|does not exist|Could not find the table/i.test(body ?? '')

/** Retire les valeurs secrètes (réglages dont la clé commence par « secret_ »). */
export function redact(table, rows) {
  if (table !== 'cms_settings_kv') return rows
  return rows.map(r => (typeof r.key === 'string' && r.key.startsWith('secret_') ? { ...r, value: REDACTED } : r))
}

/** Clés triées récursivement : deux sauvegardes d'un même contenu sont identiques à l'octet près. */
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
  }
  return value
}

/** Lit toutes les lignes d'une table, par pages. Renvoie { rows } ou { missing: true } ; lève une erreur sinon. */
export async function fetchAll(baseUrl, key, table, order, fetchImpl = fetch) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const url = `${baseUrl}/rest/v1/${table}?select=*&order=${order.map(o => `${o}.asc`).join(',')}`
    const res = await fetchImpl(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE_SIZE - 1}`, 'Range-Unit': 'items' },
    })
    const text = await res.text()
    if (!res.ok) {
      if (isMissingTable(res.status, text)) return { missing: true }
      throw new Error(`${table} : HTTP ${res.status} ${text.slice(0, 200)}`)
    }
    const page = JSON.parse(text)
    rows.push(...page)
    if (page.length < PAGE_SIZE) return { rows }
  }
}

export async function runBackup({ url, key, outDir, fetchImpl = fetch }) {
  const base = url.replace(/\/+$/, '')
  await mkdir(outDir, { recursive: true })
  const manifest = {}
  for (const [table, order] of Object.entries(TABLES)) {
    const result = await fetchAll(base, key, table, order, fetchImpl)
    if (result.missing) { manifest[table] = { status: 'absente de la base' }; continue }
    const rows = redact(table, result.rows)
    await writeFile(path.join(outDir, `${table}.json`), JSON.stringify(stable(rows), null, 2) + '\n', 'utf8')
    manifest[table] = { status: 'ok', lignes: rows.length }
  }
  if (!Object.values(manifest).some(m => m.status === 'ok')) {
    throw new Error('Aucune table sauvegardée : vérifiez SUPABASE_URL et la clé.')
  }
  await writeFile(path.join(outDir, '_manifeste.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  return manifest
}

// Exécution en ligne de commande (et non à l'import par les tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const outDir = process.argv[2]
  if (!url || !key || !outDir) {
    console.error('Usage : SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/backup-supabase.mjs <dossier>')
    process.exit(2)
  }
  runBackup({ url, key, outDir })
    .then(m => { for (const [t, v] of Object.entries(m)) console.log(`${t} : ${v.status}${v.lignes !== undefined ? ` (${v.lignes} lignes)` : ''}`) })
    .catch(e => { console.error(`Sauvegarde échouée : ${e.message}`); process.exit(1) })
}
