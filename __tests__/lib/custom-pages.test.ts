import { describe, it, expect } from 'vitest'
import { blankPage, findPage, findPublishedPage, isValidSlug, movePage, pageHref,
  parsePages, removePage, serializePages, slugify, uniqueSlug, upsertPage, type CustomPage, duplicatePage } from '@/lib/custom-pages'
import { blankBlock } from '@/lib/custom-sections'

const page = (patch: Partial<CustomPage> = {}): CustomPage => ({
  id: 'p1', slug: 'ateliers', title: 'Ateliers', intro: '', published: true,
  blocks: [], seoTitle: '', seoDescription: '', seoImage: '', ...patch,
})

describe('slugify', () => {
  it('retire les accents et les caractères spéciaux', () => {
    expect(slugify('Nos ateliers 2026')).toBe('nos-ateliers-2026')
    expect(slugify('Réflexions & Cie')).toBe('reflexions-cie')
    expect(slugify('  --Déjà--  ')).toBe('deja')
    expect(slugify('')).toBe('')
  })

  it('accepte un slug propre et refuse le reste', () => {
    expect(isValidSlug('nos-ateliers')).toBe(true)
    expect(isValidSlug('nos--ateliers')).toBe(false)
    expect(isValidSlug('Nos Ateliers')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('uniqueSlug', () => {
  it('ajoute un suffixe quand l’adresse est prise', () => {
    const pages = [page({ slug: 'ateliers' }), page({ id: 'p2', slug: 'ateliers-2' })]
    expect(uniqueSlug(pages, 'ateliers')).toBe('ateliers-3')
  })

  it('ignore la page en cours d’édition', () => {
    const pages = [page({ slug: 'ateliers' })]
    expect(uniqueSlug(pages, 'ateliers', 'p1')).toBe('ateliers')
  })

  it('retombe sur « page » quand le slug est vide', () => {
    expect(uniqueSlug([], '')).toBe('page')
  })
})

describe('parsePages', () => {
  it('relit ce qui a été enregistré', () => {
    const pages = [page(), page({ id: 'p2', slug: 'autre', published: false })]
    expect(parsePages(serializePages(pages))).toEqual(pages)
  })

  it('ne casse jamais sur une valeur vide ou invalide', () => {
    expect(parsePages('')).toEqual([])
    expect(parsePages(null)).toEqual([])
    expect(parsePages('{')).toEqual([])
    expect(parsePages('{"a":1}')).toEqual([])
    expect(parsePages('[{"id":"x"}]')).toEqual([]) // slug manquant
  })

  it('normalise une adresse écrite à la main', () => {
    const [p] = parsePages('[{"id":"x","slug":"Pas Valide !"}]')
    expect(p.slug).toBe('pas-valide')
  })

  it('écarte deux pages qui partageraient la même adresse', () => {
    const raw = JSON.stringify([page(), page({ id: 'p2' })])
    expect(parsePages(raw)).toHaveLength(1)
  })

  it('sérialise une liste vide en chaîne vide (retour aux défauts)', () => {
    expect(serializePages([])).toBe('')
  })
})

describe('édition', () => {
  it('crée une page vierge hors ligne avec une adresse libre', () => {
    const p = blankPage([page({ slug: 'nouvelle-page' })])
    expect(p.slug).toBe('nouvelle-page-2')
    expect(p.published).toBe(false)
    expect(p.blocks).toEqual([])
  })

  it('ajoute puis met à jour une page', () => {
    const created = upsertPage([], page())
    expect(created).toHaveLength(1)
    const updated = upsertPage(created, { ...created[0], title: 'Ateliers 2026' })
    expect(updated).toHaveLength(1)
    expect(updated[0].title).toBe('Ateliers 2026')
  })

  it('corrige une adresse déjà prise à l’enregistrement', () => {
    const pages = [page(), page({ id: 'p2', slug: 'autre' })]
    const merged = upsertPage(pages, { ...pages[1], slug: 'ateliers' })
    expect(findPage(merged, 'ateliers')?.id).toBe('p1')
    expect(findPage(merged, 'ateliers-2')?.id).toBe('p2')
  })

  it('supprime et déplace une page', () => {
    const pages = [page(), page({ id: 'p2', slug: 'autre' })]
    expect(removePage(pages, 'p1')).toHaveLength(1)
    expect(movePage(pages, 'p2', -1)[0].id).toBe('p2')
    expect(movePage(pages, 'p1', -1)).toBe(pages) // déjà en tête : rien à faire
  })

  it('ne renvoie que les pages en ligne sur le site public', () => {
    const pages = [page(), page({ id: 'p2', slug: 'brouillon', published: false })]
    expect(findPublishedPage(pages, 'ateliers')?.id).toBe('p1')
    expect(findPublishedPage(pages, 'brouillon')).toBeUndefined()
    expect(findPublishedPage(pages, 'inexistante')).toBeUndefined()
  })

  it('conserve les blocs personnalisés', () => {
    const blocks = [blankBlock('texte', 'b1'), blankBlock('cta', 'b2')]
    const [saved] = parsePages(serializePages([page({ blocks })]))
    expect(saved.blocks.map(b => b.id)).toEqual(['b1', 'b2'])
  })

  it('construit l’adresse publique', () => {
    expect(pageHref('ateliers')).toBe('/p/ateliers')
  })
})

describe('duplicatePage', () => {
  const original = {
    id: 'p1', slug: 'mes-tarifs', title: 'Mes tarifs', intro: 'Intro', published: true,
    blocks: [{ id: 'b1', type: 'texte', text: 'Bonjour', align: 'left' }] as never,
    seoTitle: 'T', seoDescription: 'D', seoImage: '',
  }
  const out = duplicatePage([original, { ...original, id: 'p2', slug: 'autre', title: 'Autre' }], 'p1')

  it('insère la copie juste après l\'original', () => {
    expect(out.map(p => p.id)).toHaveLength(3)
    expect(out[0].id).toBe('p1')
    expect(out[1].title).toBe('Mes tarifs (copie)')
    expect(out[2].id).toBe('p2')
  })
  it('la copie est HORS LIGNE avec une adresse libre', () => {
    expect(out[1].published).toBe(false)
    expect(out[1].slug).toBe('mes-tarifs-copie')
    expect(out[1].id).not.toBe('p1')
  })
  it('une seconde copie reçoit une autre adresse', () => {
    const twice = duplicatePage(out, 'p1')
    expect(new Set(twice.map(p => p.slug)).size).toBe(twice.length)
  })
  it('les blocs sont copiés en profondeur avec de nouveaux identifiants', () => {
    expect(out[1].blocks[0].id).not.toBe('b1')
    ;(out[1].blocks[0] as { text: string }).text = 'modifié'
    expect((original.blocks[0] as { text: string }).text).toBe('Bonjour')
  })
  it('page inconnue : liste inchangée', () => {
    const list = [original]
    expect(duplicatePage(list, 'zzz')).toBe(list)
  })
})
