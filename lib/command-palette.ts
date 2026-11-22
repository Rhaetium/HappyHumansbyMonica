// Palette de commandes de l'admin (Ctrl/Cmd + K) : un seul champ pour aller partout (onglets, pages, articles,
// textes du site) ou lancer une action (nouvel article, enregistrer…), comme dans Sanity.
// Fonctions pures, sans React : testées dans __tests__/lib/command-palette.test.ts.

import type { ContentField } from '@/lib/cms-search'

export type CommandAction =
  | { type: 'tab'; tab: string }
  | { type: 'page'; page: string }
  | { type: 'field'; page: string; key: string }
  | { type: 'article'; id: number }
  | { type: 'newArticle' }
  | { type: 'save' }

export type Command = {
  id: string
  label: string
  /** ligne grise sous le libellé (où ça mène, aperçu du texte) */
  hint: string
  group: 'Actions' | 'Aller à' | 'Pages' | 'Articles' | 'Textes du site'
  /** mots en plus du libellé qui font trouver la commande */
  keywords: string
  action: CommandAction
}

/** Minuscules, sans accents ni emoji ni ponctuation : « Référencement ✨ » → « referencement ». */
export function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type PaletteSources = {
  tabs: { id: string; label: string }[]
  pages: { id: string; label: string; emoji?: string }[]
  articles: { id: number; title: string; published: boolean }[]
  fields: Pick<ContentField, 'page' | 'pageLabel' | 'key' | 'label' | 'effectiveValue'>[]
}

const snippet = (s: string, n = 70) => {
  const t = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

export function buildCommands(src: PaletteSources, opts: { canSave?: boolean } = {}): Command[] {
  const out: Command[] = [
    { id: 'a:new-article', label: 'Nouvel article', hint: 'Ouvre l’éditeur avec le gabarit', group: 'Actions', keywords: 'creer ecrire rediger blog', action: { type: 'newArticle' } },
  ]
  if (opts.canSave) {
    out.push({ id: 'a:save', label: 'Enregistrer les modifications', hint: 'Comme Ctrl + S', group: 'Actions', keywords: 'sauvegarder publier brouillon', action: { type: 'save' } })
  }
  for (const t of src.tabs) {
    out.push({ id: `t:${t.id}`, label: t.label.replace(/^[^\p{L}\p{N}]+/u, ''), hint: 'Onglet de l’admin', group: 'Aller à', keywords: t.id, action: { type: 'tab', tab: t.id } })
  }
  for (const p of src.pages) {
    out.push({ id: `p:${p.id}`, label: p.label, hint: 'Modifier les textes de cette page', group: 'Pages', keywords: p.id, action: { type: 'page', page: p.id } })
  }
  for (const a of src.articles) {
    out.push({ id: `r:${a.id}`, label: a.title || '(sans titre)', hint: a.published ? 'Article publié' : 'Article brouillon', group: 'Articles', keywords: '', action: { type: 'article', id: a.id } })
  }
  for (const f of src.fields) {
    if (!f.label) continue
    out.push({
      id: `f:${f.page}:${f.key}`, label: f.label, hint: `${f.pageLabel} · ${snippet(f.effectiveValue)}`,
      group: 'Textes du site', keywords: f.effectiveValue.length < 400 ? snippet(f.effectiveValue, 300) : '', action: { type: 'field', page: f.page, key: f.key },
    })
  }
  return out
}

const GROUP_ORDER: Command['group'][] = ['Actions', 'Aller à', 'Pages', 'Articles', 'Textes du site']

/**
 * Commandes qui correspondent à la saisie, les meilleures d'abord. Tous les mots saisis doivent apparaître
 * (début de mot ou dans le mot) ; le libellé pèse plus que l'indice, qui pèse plus que les mots-clés.
 * Saisie vide : les actions et les onglets, dans l'ordre.
 */
export function searchCommands(commands: Command[], query: string, limit = 12): Command[] {
  const words = normalize(query).split(' ').filter(Boolean)
  if (!words.length) return commands.filter(c => c.group === 'Actions' || c.group === 'Aller à').slice(0, limit)
  const scored: { c: Command; score: number; i: number }[] = []
  commands.forEach((c, i) => {
    const label = normalize(c.label), hint = normalize(c.hint), kw = normalize(c.keywords)
    let score = 0
    for (const w of words) {
      const starts = new RegExp(`(^|\\s)${w.replace(/[^a-z0-9]/g, '')}`)
      let s = 0
      if (label === w) s = 100
      else if (starts.test(label)) s = 40
      else if (label.includes(w)) s = 20
      else if (starts.test(hint)) s = 8
      else if (hint.includes(w) || starts.test(kw)) s = 5
      else if (kw.includes(w)) s = 2
      if (!s) { score = 0; break } // tous les mots doivent être trouvés
      score += s
    }
    if (score) scored.push({ c, score: score - GROUP_ORDER.indexOf(c.group) * 0.1, i })
  })
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).slice(0, limit).map(s => s.c)
}

/** Ctrl + K (Windows, Linux) ou Cmd + K (Mac). */
export function isPaletteShortcut(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey?: boolean }): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k'
}
