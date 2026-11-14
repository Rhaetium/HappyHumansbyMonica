import { describe, it, expect } from 'vitest'
import { plainText, safeJsonLd, faqPageSchema, breadcrumbListSchema, serviceSchema } from '@/lib/json-ld'

describe('plainText', () => {
  it('retire le gras, l’italique et les liens du mini-format du CMS', () => {
    expect(plainText('Un **accompagnement** *sur mesure*, voir [la page](/coaching) ou [Calendly](https://calendly.com/x).'))
      .toBe('Un accompagnement sur mesure, voir la page ou Calendly.')
  })

  it('aplatit les retours à la ligne et les espaces', () => {
    expect(plainText('  Une ligne\n\nUne autre   ligne ')).toBe('Une ligne Une autre ligne')
  })
})

describe('safeJsonLd', () => {
  it('ne laisse jamais fermer la balise <script> depuis un texte du CMS', () => {
    const out = safeJsonLd({ text: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<')
    expect(JSON.parse(out).text).toBe('</script><script>alert(1)</script>') // le contenu d'origine reste intact une fois lu
  })

  it('échappe aussi & et > et reste du JSON valide', () => {
    const out = safeJsonLd({ a: 'R&D > 5' })
    expect(out).not.toMatch(/[<>&]/)
    expect(JSON.parse(out)).toEqual({ a: 'R&D > 5' })
  })

  it('échappe les séparateurs de ligne Unicode', () => {
    const out = safeJsonLd({ a: `x${String.fromCharCode(0x2028)}y${String.fromCharCode(0x2029)}z` })
    expect(out).not.toContain(String.fromCharCode(0x2028))
    expect(out).not.toContain(String.fromCharCode(0x2029))
  })
})

describe('faqPageSchema', () => {
  it('produit un FAQPage schema.org avec des réponses en texte brut', () => {
    const s = faqPageSchema([{ q: 'Comment réserver ?', a: 'Via **Calendly** : [réserver](/booking).' }]) as any
    expect(s['@context']).toBe('https://schema.org')
    expect(s['@type']).toBe('FAQPage')
    expect(s.mainEntity).toEqual([
      { '@type': 'Question', name: 'Comment réserver ?', acceptedAnswer: { '@type': 'Answer', text: 'Via Calendly : réserver.' } },
    ])
  })

  it('ignore les questions ou réponses vides', () => {
    const s = faqPageSchema([{ q: 'Vide ?', a: '  ' }, { q: '', a: 'Orpheline' }, { q: 'Ok ?', a: 'Oui' }]) as any
    expect(s.mainEntity).toHaveLength(1)
    expect(s.mainEntity[0].name).toBe('Ok ?')
  })

  it('renvoie null quand il n’y a aucune question (pas de balise vide)', () => {
    expect(faqPageSchema([])).toBeNull()
    expect(faqPageSchema([{ q: '', a: '' }])).toBeNull()
  })
})

describe('breadcrumbListSchema', () => {
  const crumbs = [{ label: 'Accueil', href: '/' }, { label: 'Coaching', href: '/coaching' }]

  it('produit un BreadcrumbList avec des adresses absolues et des positions', () => {
    const s = breadcrumbListSchema(crumbs, 'https://happyhumans.fr/') as any
    expect(s['@type']).toBe('BreadcrumbList')
    expect(s.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://happyhumans.fr/' },
      { '@type': 'ListItem', position: 2, name: 'Coaching', item: 'https://happyhumans.fr/coaching' },
    ])
  })

  it('suit l’adresse du site (changement de domaine)', () => {
    const s = breadcrumbListSchema(crumbs, 'https://autre.test') as any
    expect(s.itemListElement[1].item).toBe('https://autre.test/coaching')
  })

  it('pas de fil pour l’accueil seul, ni pour des libellés vides', () => {
    expect(breadcrumbListSchema([{ label: 'Accueil', href: '/' }], 'https://x.test')).toBeNull()
    expect(breadcrumbListSchema([{ label: 'Accueil', href: '/' }, { label: '  ', href: '/vide' }], 'https://x.test')).toBeNull()
  })

  it('retire le formatage du CMS dans les libellés', () => {
    const s = breadcrumbListSchema([{ label: 'Accueil', href: '/' }, { label: '**Mon** *offre*', href: '/offre' }], 'https://x.test') as any
    expect(s.itemListElement[1].name).toBe('Mon offre')
  })
})

describe('serviceSchema', () => {
  it('décrit la prestation avec ce que la page dit, et son prestataire', () => {
    const s = serviceSchema({ name: 'Coaching individuel', description: 'Un **accompagnement** sur mesure.', url: 'https://x.test/coaching', providerName: 'Monica Schneider' }) as any
    expect(s).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Coaching individuel',
      description: 'Un accompagnement sur mesure.',
      url: 'https://x.test/coaching',
      provider: { '@type': 'Person', name: 'Monica Schneider' },
    })
  })

  it('n’invente rien : pas de description ni de prestataire vides', () => {
    const s = serviceSchema({ name: 'Offre', url: 'https://x.test/o' }) as any
    expect(s).not.toHaveProperty('description')
    expect(s).not.toHaveProperty('provider')
  })

  it('renvoie null sans titre (pas de balise vide)', () => {
    expect(serviceSchema({ name: '  ', url: 'https://x.test/o' })).toBeNull()
    expect(serviceSchema({ url: 'https://x.test/o' })).toBeNull()
  })
})

