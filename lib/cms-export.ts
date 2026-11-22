// Sauvegarde du CMS : le CMS est la source de vérité du site, donc son contenu se sauvegarde.
// Un seul fichier JSON : textes (publiés et brouillons), réglages, articles. Les secrets (clés d'API, mots de passe
// enregistrés dans les Connexions) n'en font JAMAIS partie. Fonctions pures, testées dans __tests__/lib/cms-export.test.ts.

export type ExportContentRow = { page: string; block_key: string; value: string | null }
export type ExportSettingRow = { key: string; value: string | null }
export type CmsExport = {
  version: 1
  exportedAt: string
  counts: { content: number; settings: number; articles: number }
  content: ExportContentRow[]
  settings: ExportSettingRow[]
  articles: Record<string, unknown>[]
}

/** Réglage à ne jamais exporter : secrets chiffrés (préfixe « secret_ ») et tout ce qui ressemble à une clé ou à un mot de passe. */
export function isSecretSetting(key: string): boolean {
  return key.startsWith('secret_') || /(^|_)(password|token|api_?key|secret)(_|$)/i.test(key)
}

export function buildExport(input: {
  content: ExportContentRow[]
  settings: ExportSettingRow[]
  articles: Record<string, unknown>[]
  now?: Date
}): CmsExport {
  const content = input.content.map(r => ({ page: r.page, block_key: r.block_key, value: r.value }))
  const settings = input.settings.filter(s => !isSecretSetting(s.key)).map(s => ({ key: s.key, value: s.value }))
  return {
    version: 1,
    exportedAt: (input.now ?? new Date()).toISOString(),
    counts: { content: content.length, settings: settings.length, articles: input.articles.length },
    content,
    settings,
    articles: input.articles,
  }
}

/** « sauvegarde-cms-2026-11-22.json » */
export function exportFileName(now: Date = new Date()): string {
  return `sauvegarde-cms-${now.toISOString().slice(0, 10)}.json`
}
