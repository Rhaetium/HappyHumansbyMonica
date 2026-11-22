import { describe, it, expect } from 'vitest'
import { buildExport, exportFileName, isSecretSetting } from '@/lib/cms-export'

describe('isSecretSetting', () => {
  it('secrets chiffrés et noms de clés sensibles', () => {
    for (const k of ['secret_searchable_api_key', 'secret_conn_brevo_api_key', 'ai_api_key', 'admin_password', 'instagram_token', 'webhook_secret'])
      expect(isSecretSetting(k), k).toBe(true)
  })
  it('réglages ordinaires conservés', () => {
    for (const k of ['theme_preset', 'theme_text_size', 'logo_url', 'gtm_id', 'conn_admin_email', 'seo_keywords', 'site_name'])
      expect(isSecretSetting(k), k).toBe(false)
  })
})

describe('buildExport', () => {
  const now = new Date('2026-11-22T10:00:00Z')
  const out = buildExport({
    content: [{ page: 'home', block_key: 'hero_title', value: 'Bonjour' }, { page: 'draft:home', block_key: 'hero_title', value: 'Brouillon' }],
    settings: [{ key: 'theme_preset', value: 'forest' }, { key: 'secret_conn_brevo_api_key', value: 'v1:chiffré' }],
    articles: [{ id: 1, title: 'A' }],
    now,
  })
  it('contient textes, brouillons, réglages et articles, avec les totaux', () => {
    expect(out.counts).toEqual({ content: 2, settings: 1, articles: 1 })
    expect(out.content.map(c => c.page)).toEqual(['home', 'draft:home'])
    expect(out.exportedAt).toBe('2026-11-22T10:00:00.000Z')
  })
  it('n’exporte aucun secret', () => {
    expect(JSON.stringify(out)).not.toContain('chiffré')
    expect(out.settings.map(s => s.key)).toEqual(['theme_preset'])
  })
  it('nom de fichier daté', () => {
    expect(exportFileName(now)).toBe('sauvegarde-cms-2026-11-22.json')
  })
})
