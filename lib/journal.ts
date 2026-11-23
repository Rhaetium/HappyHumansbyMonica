// Journal des modifications : toutes les modifications de textes enregistrées en ligne, des plus récentes aux plus anciennes,
// avec le nom du champ en clair (« Page Coaching — Introduction ») au lieu de sa clé technique, regroupées par jour.
// Les données viennent de /api/cms/history (déclencheur de base de données) ; chaque ligne peut être restaurée.
// Logique pure, testée dans __tests__/lib/journal.test.ts.

export type HistoryRow = { id: number; page: string; block_key: string; old_value: string | null; new_value: string | null; changed_at: string }

export type FieldLabels = Record<string, { pageLabel: string; fields: Record<string, string> }>

export type JournalEntry = HistoryRow & {
  /** « Page Coaching — Introduction » ; à défaut, la clé technique. */
  title: string
  kind: 'ajout' | 'suppression' | 'modification'
}

export type JournalDay = { day: string; label: string; entries: JournalEntry[] }

/** Libellés lisibles : page → { pageLabel, clé → libellé }, construits depuis la configuration de l'admin. */
export function buildFieldLabels(config: Record<string, { label: string; sections: { key: string; label: string }[] }>): FieldLabels {
  const out: FieldLabels = {}
  for (const [page, cfg] of Object.entries(config)) {
    out[page] = { pageLabel: cfg.label, fields: Object.fromEntries(cfg.sections.map(s => [s.key, s.label])) }
  }
  return out
}

export function describeEntry(row: HistoryRow, labels: FieldLabels): JournalEntry {
  const page = labels[row.page]
  const field = page?.fields[row.block_key]
  const title = page ? `${page.pageLabel} — ${field ?? row.block_key}` : `${row.page} — ${row.block_key}`
  const before = (row.old_value ?? '').trim()
  const after = (row.new_value ?? '').trim()
  return { ...row, title, kind: !before && after ? 'ajout' : before && !after ? 'suppression' : 'modification' }
}

/** Extrait court d'une valeur : sans balises HTML, tronqué, « (vide) » si rien. */
export function snippet(value: string | null, max = 90): string {
  const text = (value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return '(vide)'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Regroupe par jour (heure de Paris), du plus récent au plus ancien ; « Aujourd’hui » et « Hier » quand c'est le cas. */
export function groupByDay(rows: HistoryRow[], labels: FieldLabels, now: Date = new Date()): JournalDay[] {
  const dayKey = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }) // AAAA-MM-JJ
  const today = dayKey(now)
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000))
  const sorted = [...rows].sort((a, b) => Date.parse(b.changed_at) - Date.parse(a.changed_at))
  const days: JournalDay[] = []
  for (const row of sorted) {
    const t = new Date(row.changed_at)
    if (Number.isNaN(t.getTime())) continue
    const day = dayKey(t)
    let group = days.find(d => d.day === day)
    if (!group) {
      const label = day === today ? 'Aujourd’hui' : day === yesterday ? 'Hier'
        : t.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' })
      group = { day, label, entries: [] }
      days.push(group)
    }
    group.entries.push(describeEntry(row, labels))
  }
  return days
}
