import { describe, expect, it } from 'vitest'
import { actionableCount, auditSeo, type SeoPageInput } from '@/lib/seo-audit'

const good = (page: string, over: Partial<SeoPageInput> = {}): SeoPageInput => ({
  page,
  label: page,
  title: `Titre détaillé de la page ${page}`,
  description: `Description de la page ${page}, assez détaillée pour donner envie de cliquer sur le résultat.`,
  image: 'https://exemple.test/image.jpg',
  indexable: true,
  ...over,
})

const fields = (issues: ReturnType<typeof auditSeo>, page: string) =>
  issues.filter(i => i.page === page).map(i => `${i.level}:${i.field}`)

describe('auditSeo', () => {
  it('ne signale rien pour une page correcte', () => {
    expect(auditSeo([good('coaching'), good('faq')])).toEqual([])
  })

  it('titre absent = erreur, description absente = avertissement', () => {
    const issues = auditSeo([good('coaching', { title: '', description: '' })])
    expect(fields(issues, 'coaching')).toEqual(['error:seo_title', 'warning:seo_description'])
  })

  it('compte la marque ajoutée par le site dans la longueur du titre', () => {
    // 46 caractères + « | Happy Humans » (15) = 61 : trop long
    const issues = auditSeo([good('a', { title: 'x'.repeat(46) }), good('b', { title: 'y'.repeat(45) })])
    expect(fields(issues, 'a')).toEqual(['warning:seo_title'])
    expect(fields(issues, 'b')).toEqual([])
  })

  it('signale une description trop longue ou trop courte', () => {
    const issues = auditSeo([
      good('long', { description: 'd'.repeat(161) }),
      good('court', { description: 'courte' }),
    ])
    expect(fields(issues, 'long')).toEqual(['warning:seo_description'])
    expect(fields(issues, 'court')).toEqual(['info:seo_description'])
  })

  it('repère les titres et descriptions en double entre deux pages ouvertes à Google', () => {
    const dup = { title: 'Même titre de page partagé', description: 'Même description '.repeat(6) }
    const issues = auditSeo([good('a', dup), good('b', dup), good('c')])
    expect(fields(issues, 'a').sort()).toEqual(['warning:seo_description', 'warning:seo_title'])
    expect(fields(issues, 'b').sort()).toEqual(['warning:seo_description', 'warning:seo_title'])
    expect(fields(issues, 'c')).toEqual([])
    expect(issues.find(i => i.page === 'a' && i.field === 'seo_title')!.message).toContain('b')
  })

  it('une page cachée à Google n’est contrôlée que sur sa visibilité (info), et ne compte pas en doublon', () => {
    const issues = auditSeo([good('a'), good('b', { indexable: false, title: '', description: '' }), good('c', { title: good('a').title })])
    expect(fields(issues, 'b')).toEqual(['info:visibility'])
    // « c » a le même titre que « a » (ouverte) : doublon ; « b » (cachée) n'entre pas dans la comparaison
    expect(fields(issues, 'a')).toContain('warning:seo_title')
  })

  it('une image de partage absente est une simple information', () => {
    const issues = auditSeo([good('coaching', { image: '' })])
    expect(fields(issues, 'coaching')).toEqual(['info:seo_image'])
  })

  it('regroupe les images de partage manquantes en UNE seule remarque, sans les pages légales', () => {
    const issues = auditSeo([
      good('coaching', { label: 'Coaching', image: '' }),
      good('faq', { label: 'FAQ', image: '' }),
      good('mentions-legales', { label: 'Mentions légales', image: '' }),
    ])
    const images = issues.filter(i => i.field === 'seo_image')
    expect(images).toHaveLength(1)
    expect(images[0].message).toContain('Coaching, FAQ')
    expect(images[0].message).not.toContain('Mentions légales')
  })

  it('un titre court sur une page légale n’est pas commenté', () => {
    expect(auditSeo([good('mentions-legales', { title: 'Mentions légales' })])).toEqual([])
  })

  it('trie les erreurs avant les avertissements puis les informations', () => {
    const issues = auditSeo([
      good('a', { image: '' }),
      good('b', { description: '' }),
      good('c', { title: '' }),
    ])
    expect(issues.map(i => i.level)).toEqual(['error', 'warning', 'info'])
  })
})

describe('actionableCount', () => {
  it('ne compte pas les informations facultatives', () => {
    const issues = auditSeo([good('a', { image: '' }), good('b', { description: '' })])
    expect(issues).toHaveLength(2)
    expect(actionableCount(issues)).toBe(1)
  })
})
