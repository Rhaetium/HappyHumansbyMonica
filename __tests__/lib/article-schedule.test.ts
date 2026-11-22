import { describe, it, expect } from 'vitest'
import { articleStatus, fromDatetimeLocal, isArticleLive, liveFilter, toDatetimeLocal } from '@/lib/article-schedule'

const now = new Date('2026-11-22T10:00:00.000Z')

describe('articleStatus', () => {
  it('brouillon : jamais en ligne, même avec une date passée', () => {
    expect(articleStatus({ published: false, published_at: '2020-01-01T00:00:00Z' }, now)).toBe('draft')
    expect(isArticleLive({ published: false }, now)).toBe(false)
  })
  it('publié avec une date passée ou sans date : en ligne', () => {
    expect(articleStatus({ published: true, published_at: '2026-11-22T09:59:59Z' }, now)).toBe('live')
    expect(articleStatus({ published: true, published_at: null }, now)).toBe('live')
    expect(articleStatus({ published: true, published_at: 'illisible' }, now)).toBe('live')
  })
  it('publié avec une date à venir : programmé, pas en ligne', () => {
    expect(articleStatus({ published: true, published_at: '2026-11-22T10:00:01Z' }, now)).toBe('scheduled')
    expect(isArticleLive({ published: true, published_at: '2027-01-01T00:00:00Z' }, now)).toBe(false)
  })
  it('à la minute exacte, l’article est en ligne', () => {
    expect(articleStatus({ published: true, published_at: now.toISOString() }, now)).toBe('live')
  })
})

describe('liveFilter', () => {
  it('sans date ou date passée', () => {
    expect(liveFilter(now)).toBe('published_at.is.null,published_at.lte.2026-11-22T10:00:00.000Z')
  })
})

describe('champ datetime-local', () => {
  it('aller-retour sans perte à la minute', () => {
    const iso = '2026-12-01T08:30:00.000Z'
    expect(fromDatetimeLocal(toDatetimeLocal(iso))).toBe(iso)
  })
  it('vide ou illisible', () => {
    expect(toDatetimeLocal(null)).toBe('')
    expect(toDatetimeLocal('x')).toBe('')
    expect(fromDatetimeLocal('')).toBeNull()
    expect(fromDatetimeLocal('x')).toBeNull()
  })
})
