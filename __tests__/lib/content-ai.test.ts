import { describe, it, expect } from 'vitest'
import {
  BLOG_SYSTEM, CAROUSEL_SYSTEM, blogLength, blogStyle, buildBlogPrompt, parseBlogResponse, parseCarouselResponse, slugFromTitle,
} from '@/lib/content-ai'

describe('consignes', () => {
  it('parlent de Happy Humans, plus de voyage', () => {
    for (const s of [BLOG_SYSTEM, CAROUSEL_SYSTEM, buildBlogPrompt('Poser ses limites', 'guide', 'short')]) {
      expect(s).not.toMatch(/voyage|destination|Madère|Lisbonne/i)
    }
    expect(BLOG_SYSTEM).toContain('Happy Humans')
  })

  it('valeurs inconnues de style et de longueur → valeurs par défaut', () => {
    expect(blogStyle('poème')).toBe('story')
    expect(blogStyle('list')).toBe('list')
    expect(blogLength(undefined)).toBe('medium')
    expect(blogLength('long')).toBe('long')
  })
})

describe('parseBlogResponse', () => {
  const article = [
    '# Poser ses **limites** au travail',
    '',
    'Dire non sans culpabiliser, ça s’apprend.',
    '',
    '## Pourquoi c’est difficile',
    'Parce que…',
    '',
    '## Pour aller plus loin',
    'Et vous ?',
    '',
    '#limites #travail #bienêtre #Limites',
  ].join('\n')

  it('sépare titre, accroche, corps et hashtags', () => {
    const d = parseBlogResponse(article)
    expect(d.title).toBe('Poser ses limites au travail')
    expect(d.excerpt).toBe('Dire non sans culpabiliser, ça s’apprend.')
    expect(d.content).not.toContain('# Poser')
    expect(d.content).not.toContain('Dire non sans culpabiliser') // l'accroche n'est pas répétée dans le corps
    expect(d.content.startsWith('## Pourquoi')).toBe(true)
    expect(d.content).toContain('## Pourquoi c’est difficile') // intertitres intacts (avant : « ### ## … »)
    expect(d.content).not.toContain('#limites')
    expect(d.hashtags).toEqual(['#limites', '#travail', '#bienêtre'])
    expect(d.suggestedSlug).toBe('poser-ses-limites-au-travail')
  })

  it('sans titre H1, prend la première ligne', () => {
    expect(parseBlogResponse('Un titre simple\nDu texte').title).toBe('Un titre simple')
  })
})

describe('slugFromTitle', () => {
  it('retire accents et ponctuation', () => {
    expect(slugFromTitle('L’élan, c’est maintenant !')).toBe('l-elan-c-est-maintenant')
  })
})

describe('parseCarouselResponse', () => {
  it('lit le JSON, ignore les slides vides et normalise les hashtags', () => {
    const raw = 'Voici : {"title":"Ralentir","slides":[{"title":"1","content":"a"},{"title":"","content":""},{"title":"2","content":"b"}],"caption":"Et vous ?","hashtags":["#calme","calme","bien être"]}'
    expect(parseCarouselResponse(raw, 'sujet')).toEqual({
      title: 'Ralentir',
      slides: [{ title: '1', content: 'a' }, { title: '2', content: 'b' }],
      caption: 'Et vous ?',
      hashtags: ['#calme', '#bienêtre'],
    })
  })

  it('sort les hashtags glissés dans la légende (sortie réelle de Llama 3.3)', () => {
    const raw = '{"title":"Ralentir","slides":[{"title":"a","content":"b"}],"caption":"Il est peut-être temps de ralentir ! #ralentir #bienêtre #Ralentir","hashtags":[]}'
    const c = parseCarouselResponse(raw, 'x')
    expect(c.caption).toBe('Il est peut-être temps de ralentir !')
    expect(c.hashtags).toEqual(['#ralentir', '#bienêtre'])
  })

  it('titre absent → le sujet ; aucune slide → erreur', () => {
    expect(parseCarouselResponse('{"slides":[{"title":"x","content":"y"}]}', 'Mon sujet').title).toBe('Mon sujet')
    expect(() => parseCarouselResponse('{"slides":[]}', 'x')).toThrow()
    expect(() => parseCarouselResponse('pas de json', 'x')).toThrow()
  })
})
