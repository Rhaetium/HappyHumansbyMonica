import { describe, it, expect } from 'vitest'
import { normalizeAnchor, normalizeStyle, parseCardLines, parseTestimonialLines, videoEmbedUrl, wrapperClasses } from '@/lib/block-options'

describe('normalizeAnchor', () => {
  it('donne une ancre propre', () => {
    expect(normalizeAnchor('Mes Tarifs !')).toBe('mes-tarifs')
    expect(normalizeAnchor('Été 2026')).toBe('ete-2026')
    expect(normalizeAnchor('###')).toBe('')
  })
})

describe('normalizeStyle', () => {
  it('garde les réglages valides, ignore le reste et les valeurs par défaut', () => {
    expect(normalizeStyle({ bg: 'sombre', space: 'ample', anchor: 'Mes Tarifs', hideMobile: true, extra: 1 }))
      .toEqual({ bg: 'sombre', space: 'ample', anchor: 'mes-tarifs', hideMobile: true })
    expect(normalizeStyle({ bg: 'auto', space: 'normal' })).toBeUndefined()
    expect(normalizeStyle({ bg: 'rouge-vif', space: 'géant', hideMobile: 'oui' })).toBeUndefined()
    expect(normalizeStyle('x')).toBeUndefined()
    expect(normalizeStyle(null)).toBeUndefined()
  })
})

describe('wrapperClasses', () => {
  it('sans réglage : aucune classe (affichage inchangé)', () => {
    expect(wrapperClasses(undefined)).toBe('')
    expect(wrapperClasses({})).toBe('')
  })
  it('assemble fond, espacement et masquage', () => {
    const c = wrapperClasses({ bg: 'vert', space: 'compact', hideMobile: true })
    expect(c).toContain('--hh-primary')
    expect(c).toContain('!py-6')
    expect(c).toContain('max-md:hidden')
    expect(wrapperClasses({ hideDesktop: true })).toBe('md:hidden')
  })
})

describe('videoEmbedUrl', () => {
  it('YouTube (plusieurs formes) passe par youtube-nocookie', () => {
    for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=3', 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://m.youtube.com/embed/dQw4w9WgXcQ']) {
      expect(videoEmbedUrl(u), u).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    }
  })
  it('Vimeo sans suivi', () => {
    expect(videoEmbedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789?dnt=1')
  })
  it('refuse tout le reste : http, autres sites, injections', () => {
    for (const u of ['http://youtu.be/dQw4w9WgXcQ', 'https://evil.example/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'https://youtube.com/watch?v="><script>', 'pas une adresse', '']) {
      expect(videoEmbedUrl(u), u).toBeNull()
    }
  })
})

describe('parseCardLines / parseTestimonialLines', () => {
  it('cartes : trois colonnes, deux colonnes, ou titre seul', () => {
    expect(parseCardLines('🌱 | Écoute | Un espace pour vous\nClarté | Voir plus net\nSeul titre\n\n')).toEqual([
      { icon: '🌱', title: 'Écoute', text: 'Un espace pour vous' },
      { icon: '', title: 'Clarté', text: 'Voir plus net' },
      { icon: '', title: 'Seul titre', text: '' },
    ])
  })
  it('un « | » en trop reste dans le texte', () => {
    expect(parseCardLines('🌱 | A | B | C')[0].text).toBe('B | C')
  })
  it('témoignages : texte et auteur facultatif', () => {
    expect(parseTestimonialLines('Très utile | Julie, dirigeante\nSans auteur')).toEqual([
      { quote: 'Très utile', author: 'Julie, dirigeante' },
      { quote: 'Sans auteur', author: '' },
    ])
  })
})
