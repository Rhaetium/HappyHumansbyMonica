import { describe, it, expect } from 'vitest'
import { buildFieldLabels, describeEntry, groupByDay, snippet, type HistoryRow } from '@/lib/journal'

const labels = buildFieldLabels({ coaching: { label: 'Coaching', sections: [{ key: 'intro', label: 'Introduction' }] } })
const row = (id: number, changed_at: string, o: Partial<HistoryRow> = {}): HistoryRow => ({ id, page: 'coaching', block_key: 'intro', old_value: 'a', new_value: 'b', changed_at, ...o })

describe('describeEntry', () => {
  it('nomme le champ en clair, ou garde la clé technique si inconnu', () => {
    expect(describeEntry(row(1, '2026-11-23T10:00:00Z'), labels).title).toBe('Coaching — Introduction')
    expect(describeEntry(row(2, '2026-11-23T10:00:00Z', { page: 'x', block_key: 'k' }), labels).title).toBe('x — k')
    expect(describeEntry(row(3, '2026-11-23T10:00:00Z', { block_key: 'inconnu' }), labels).title).toBe('Coaching — inconnu')
  })
  it('distingue ajout, suppression et modification', () => {
    expect(describeEntry(row(1, '2026-11-23T10:00:00Z', { old_value: null }), labels).kind).toBe('ajout')
    expect(describeEntry(row(1, '2026-11-23T10:00:00Z', { new_value: '  ' }), labels).kind).toBe('suppression')
    expect(describeEntry(row(1, '2026-11-23T10:00:00Z'), labels).kind).toBe('modification')
  })
})

describe('snippet', () => {
  it('retire le HTML, tronque, et signale le vide', () => {
    expect(snippet('<p>Bonjour <b>tous</b></p>')).toBe('Bonjour tous')
    expect(snippet('x'.repeat(200), 10)).toBe('xxxxxxxxxx…')
    expect(snippet(null)).toBe('(vide)')
  })
})

describe('groupByDay', () => {
  const now = new Date('2026-11-23T12:00:00Z')
  it('regroupe par jour, du plus récent au plus ancien, avec Aujourd’hui et Hier', () => {
    const days = groupByDay([
      row(1, '2026-11-21T09:00:00Z'),
      row(2, '2026-11-23T08:00:00Z'),
      row(3, '2026-11-22T20:00:00Z'),
      row(4, '2026-11-23T11:00:00Z'),
    ], labels, now)
    expect(days.map(d => d.label).slice(0, 2)).toEqual(['Aujourd’hui', 'Hier'])
    expect(days[0].entries.map(e => e.id)).toEqual([4, 2])
    expect(days).toHaveLength(3)
  })
  it('ignore une date illisible', () => {
    expect(groupByDay([row(1, 'pas une date')], labels, now)).toEqual([])
  })
})
