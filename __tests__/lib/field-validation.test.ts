import { describe, it, expect } from 'vitest'
import { validateField, validatePage } from '@/lib/field-validation'
import { PAGES_CONFIG } from '@/components/cms/admin/config'
import { PAGE_DEFAULTS } from '@/lib/cms-page-defaults'

const text = { key: 'hero_title', label: 'Bandeau — Titre', type: 'text' }
const href = { key: 'hero_cta_contact_href', label: 'Bandeau — destination', type: 'text' }
const image = { key: 'hero_image', label: 'Bandeau — Photo', type: 'image' }

describe('validateField', () => {
  it('accepte vide et un simple espace (texte masqué)', () => {
    expect(validateField(text, '')).toBeNull()
    expect(validateField(text, ' ')).toBeNull()
    expect(validateField(href, undefined)).toBeNull()
  })

  it('accepte les destinations valides', () => {
    for (const v of ['/contact', '/blog/mon-article', '#tarifs', 'https://calendly.com/x', 'mailto:a@b.fr', 'tel:+33 6 12 34 56 78']) {
      expect(validateField(href, v), v).toBeNull()
    }
  })

  it('refuse les destinations invalides', () => {
    for (const v of ['contact', 'www.exemple.fr', '//evil.example', 'https://', 'javascript:alert(1)', '/a b']) {
      expect(validateField(href, v)?.level, v).toBe('error')
    }
  })

  it('refuse une image qui n’est ni un chemin ni un lien', () => {
    expect(validateField(image, 'photo.jpg')?.level).toBe('error')
    expect(validateField(image, '/images/a.webp')).toBeNull()
    expect(validateField(image, 'https://x.supabase.co/a.png')).toBeNull()
  })

  it('avertit d’un passage entre crochets resté dans un texte', () => {
    expect(validateField(text, 'Bienvenue [Prénom], ravie de vous voir')?.level).toBe('warning')
    expect(validateField(text, 'Un texte normal')).toBeNull()
  })

  it('n’avertit pas pour un lien en markdown, autorisé dans les textes longs', () => {
    expect(validateField({ ...text, type: 'textarea' }, 'Voir [la page coaching](/coaching) ou [Calendly](https://x.fr)')).toBeNull()
  })
})

describe('valeurs d’origine du site', () => {
  it('aucune valeur par défaut ne serait refusée ou signalée par la validation', () => {
    const bad: string[] = []
    for (const [page, cfg] of Object.entries(PAGES_CONFIG)) {
      const defaults = PAGE_DEFAULTS[page] ?? {}
      for (const s of cfg.sections) {
        const issue = validateField(s, defaults[s.key])
        if (issue) bad.push(`${page}.${s.key} : ${issue.message} (${JSON.stringify(defaults[s.key]).slice(0, 60)})`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('validatePage', () => {
  const defs = [text, href, image]
  const content = { 'home__hero_title': '[À compléter]', 'home__hero_cta_contact_href': 'contact', 'home__hero_image': '/a.webp' }

  it('liste les erreurs avant les avertissements', () => {
    const res = validatePage(defs, content, 'home')
    expect(res.map(r => [r.key, r.level])).toEqual([['hero_cta_contact_href', 'error'], ['hero_title', 'warning']])
  })

  it('ne contrôle que les champs demandés', () => {
    expect(validatePage(defs, content, 'home', ['hero_title']).map(r => r.key)).toEqual(['hero_title'])
    expect(validatePage(defs, content, 'home', [])).toEqual([])
  })
})
