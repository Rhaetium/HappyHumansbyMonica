import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToString } from 'react-dom/server'
import { useCmsContent } from '@/hooks/useCmsContent'
import { CmsInitialContent } from '@/contexts/CmsInitialContent'

/**
 * Le HTML envoyé par le serveur doit contenir les VRAIS textes de la page : les robots qui n'exécutent pas
 * le JavaScript (la plupart des robots des IA) ne lisent que lui. Avant : le titre était vide (c.get() n'était
 * rendu que dans le navigateur) et seuls les textes par défaut apparaissaient, jamais ceux publiés dans le CMS.
 */

const editState = vi.hoisted(() => ({ value: null as null | { isEditing: boolean; pendingChanges: Record<string, Record<string, string>> } }))
vi.mock('@/contexts/InlineEditContext', () => ({ useOptionalInlineEdit: () => editState.value }))
// Chargé uniquement dans le navigateur, comme en production (ssr: false) : rien dans le HTML serveur.
vi.mock('next/dynamic', () => ({ default: () => () => null }))

const DEFAULTS = { title: 'Titre par défaut', intro: 'Intro par défaut', desc: 'Description par défaut' }

function Probe() {
  const c = useCmsContent('coaching', DEFAULTS)
  return (
    <main>
      <h1>{c.get('title')}</h1>
      <p>{c.intro}</p>
      <p>{c.get('desc', undefined, { multiline: true })}</p>
    </main>
  )
}

const publishedOnServer = { ...DEFAULTS, title: 'Titre publié par Monica', intro: 'Intro publiée par Monica' }

beforeEach(() => { editState.value = null })

describe('HTML rendu sur le serveur', () => {
  it('contient le titre écrit avec get() : le H1 n’est plus vide', () => {
    const html = renderToString(<Probe />)
    expect(html).toContain('<h1><span>Titre par défaut</span></h1>')
  })

  it('contient les textes publiés dans le CMS, pas seulement les textes par défaut', () => {
    const html = renderToString(<CmsInitialContent pages={{ coaching: publishedOnServer }}><Probe /></CmsInitialContent>)
    expect(html).toContain('Titre publié par Monica') // via get()
    expect(html).toContain('Intro publiée par Monica') // via c.cle
    expect(html).not.toContain('Titre par défaut')
    expect(html).not.toContain('Intro par défaut')
  })

  it('un champ non publié garde son texte par défaut', () => {
    const html = renderToString(<CmsInitialContent pages={{ coaching: publishedOnServer }}><Probe /></CmsInitialContent>)
    expect(html).toContain('Description par défaut')
  })

  it('n’utilise aucun contenu différé : plus de balise <template> à la place du texte', () => {
    const html = renderToString(<CmsInitialContent pages={{ coaching: publishedOnServer }}><Probe /></CmsInitialContent>)
    expect(html).not.toContain('<template')
  })

  it('le contenu d’une autre page n’est pas utilisé', () => {
    const html = renderToString(<CmsInitialContent pages={{ autre: { title: 'Titre d’une autre page' } }}><Probe /></CmsInitialContent>)
    expect(html).not.toContain('Titre d’une autre page')
    expect(html).toContain('Titre par défaut')
  })

  it('des contenus imbriqués se cumulent (layout racine + layout de la page)', () => {
    const html = renderToString(
      <CmsInitialContent pages={{ site: { x: '1' } }}>
        <CmsInitialContent pages={{ coaching: publishedOnServer }}><Probe /></CmsInitialContent>
      </CmsInitialContent>,
    )
    expect(html).toContain('Titre publié par Monica')
  })
})

describe('édition en ligne', () => {
  it('pendant l’édition, le champ éditable remplace le texte simple', () => {
    editState.value = { isEditing: true, pendingChanges: {} }
    const html = renderToString(<Probe />)
    expect(html).not.toContain('<span>Titre par défaut</span>')
  })

  it('une modification non enregistrée garde le champ éditable, même hors édition', () => {
    editState.value = { isEditing: false, pendingChanges: { coaching: { title: 'brouillon' } } }
    const html = renderToString(<Probe />)
    expect(html).not.toContain('<span>Titre par défaut</span>')
    expect(html).toContain('<span>Description par défaut</span>') // les autres champs restent simples
  })

  it('hors édition et sans modification : texte simple, comme un visiteur', () => {
    editState.value = { isEditing: false, pendingChanges: {} }
    expect(renderToString(<Probe />)).toContain('<h1><span>Titre par défaut</span></h1>')
  })
})

// Garde-fou : chaque page du CMS doit recevoir son contenu publié par le serveur (CmsServerContent), sinon son HTML
// ne contiendrait que les textes par défaut. Une nouvelle page doit être ajoutée ici ET enveloppée dans son layout.
describe('chaque page reçoit son contenu publié depuis le serveur', () => {
  const root = path.resolve(__dirname, '../..')
  const WRAPPERS: Record<string, string> = {
    home: 'app/page.tsx',
    'a-propos': 'app/a-propos/layout.tsx',
    booking: 'app/booking/layout.tsx',
    coaching: 'app/coaching/layout.tsx',
    contact: 'app/contact/layout.tsx',
    entreprises: 'app/entreprises/layout.tsx',
    faq: 'app/faq/layout.tsx',
    'happiness-design': 'app/happiness-design/layout.tsx',
    relations: 'app/relations/layout.tsx',
    'sparring-partner': 'app/sparring-partner/layout.tsx',
    blog: 'app/blog/page.tsx',
    'mentions-legales': 'app/mentions-legales/page.tsx',
    'politique-confidentialite': 'app/politique-confidentialite/page.tsx',
    // textes partagés par toutes les pages (bandeau cookies, pied de page, fil d'Ariane)
    site: 'app/layout.tsx',
    footer: 'app/layout.tsx',
    'fil-ariane': 'app/layout.tsx',
  }

  it.each(Object.entries(WRAPPERS))('« %s » est lue par le serveur dans %s', (page, file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    expect(source, `${file} doit envelopper la page dans <CmsServerContent pages={{ '${page}': … }}>`).toContain('CmsServerContent')
    expect(source).toMatch(new RegExp(`['"]?${page.replace('-', '\\-')}['"]?\\s*:\\s*[A-Z_]+DEFAULTS`))
  })
})

