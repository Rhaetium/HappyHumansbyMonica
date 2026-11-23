import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
// @ts-expect-error : script .mjs sans types
import { PAGE_SIZE, REDACTED, TABLES, fetchAll, isMissingTable, redact, runBackup, stable } from '../../scripts/backup-supabase.mjs'

const json = (body: unknown, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })

describe('redact', () => {
  it('masque les valeurs secrètes des réglages, et seulement elles', () => {
    const rows = [{ key: 'secret_resend', value: 'abc' }, { key: 'gsc_verification', value: 'tok' }]
    expect(redact('cms_settings_kv', rows)).toEqual([{ key: 'secret_resend', value: REDACTED }, { key: 'gsc_verification', value: 'tok' }])
    expect(redact('site_content', [{ block_key: 'secret_x', value: 'v' }])).toEqual([{ block_key: 'secret_x', value: 'v' }])
  })
})

describe('stable', () => {
  it('trie les clés récursivement : même contenu, même texte', () => {
    expect(JSON.stringify(stable({ b: 1, a: { d: 1, c: 2 } }))).toBe(JSON.stringify(stable({ a: { c: 2, d: 1 }, b: 1 })))
  })
})

describe('isMissingTable', () => {
  it('reconnaît une table absente, pas une panne', () => {
    expect(isMissingTable(404, '')).toBe(true)
    expect(isMissingTable(404, '{"code":"PGRST205"}')).toBe(true)
    expect(isMissingTable(500, 'relation "x" does not exist')).toBe(true)
    expect(isMissingTable(401, 'Invalid API key')).toBe(false)
  })
})

describe('fetchAll', () => {
  it('lit toutes les pages', async () => {
    const calls: string[] = []
    const impl = async (_url: string, init: { headers: Record<string, string> }) => {
      calls.push(init.headers.Range)
      return calls.length === 1 ? json(Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i }))) : json([{ id: PAGE_SIZE }])
    }
    const res = await fetchAll('https://x.supabase.co', 'k', 't', ['id'], impl as never)
    expect(res.rows).toHaveLength(PAGE_SIZE + 1)
    expect(calls).toEqual([`0-${PAGE_SIZE - 1}`, `${PAGE_SIZE}-${2 * PAGE_SIZE - 1}`])
  })

  it('échoue bruyamment sur une vraie erreur (clé refusée)', async () => {
    await expect(fetchAll('https://x', 'k', 't', ['id'], (async () => json('Invalid API key', 401)) as never)).rejects.toThrow(/HTTP 401/)
  })
})

describe('runBackup', () => {
  it('écrit un fichier par table, note les tables absentes, ne garde aucun secret', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'bk-'))
    const impl = async (url: string) => {
      if (url.includes('/questionnaires?')) return json({ code: 'PGRST205' }, 404)
      if (url.includes('/cms_settings_kv?')) return json([{ key: 'secret_k', value: 'chiffre' }, { key: 'a', value: '1' }])
      return json([{ id: 1 }])
    }
    const manifest = await runBackup({ url: 'https://x.supabase.co/', key: 'k', outDir: dir, fetchImpl: impl as never })
    expect(manifest.questionnaires.status).toBe('absente de la base')
    expect(manifest.site_content.lignes).toBe(1)
    const files = await readdir(dir)
    expect(files).toContain('site_content.json')
    expect(files).toContain('_manifeste.json')
    expect(files).not.toContain('questionnaires.json')
    expect(await readFile(path.join(dir, 'cms_settings_kv.json'), 'utf8')).not.toContain('chiffre')
    expect(Object.keys(TABLES)).toContain('contact_messages')
  })

  it('refuse un dossier de sauvegarde vide si aucune table n’a répondu', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'bk-'))
    await expect(runBackup({ url: 'https://x', key: 'k', outDir: dir, fetchImpl: (async () => json({}, 404)) as never })).rejects.toThrow(/Aucune table/)
  })
})
