import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { LIST_DEFS } from '@/lib/cms-lists'

/**
 * Garde-fou « tout le site est modifiable depuis le CMS ».
 *
 * Pour chaque page pilotée par le CMS, vérifie que :
 *   1. chaque texte lu par la page (c.get('x'), c.x, c['x']) a un champ dans l'admin (PAGES_CONFIG) ;
 *   2. chaque champ de l'admin a une valeur par défaut (lib/cms-defaults/<page>.ts) ;
 *   3. chaque champ de l'admin est réellement lu par la page (sinon l'admin affiche un champ sans effet).
 *
 * Si ce test échoue après l'ajout d'un texte : ajoutez la clé dans lib/cms-defaults/<page>.ts
 * ET un champ dans PAGES_CONFIG (app/cms-admin/page.tsx). Voir docs/CMS_ARCHITECTURE.md.
 */

const root = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n')

// page admin -> fichiers qui lisent son contenu
const PAGES: Record<string, string[]> = {
  home: ['app/HomeContent.tsx'], // app/page.tsx n'est plus que l'enveloppe serveur (lecture du contenu publié)
  'a-propos': ['app/a-propos/page.tsx'],
  coaching: ['app/coaching/page.tsx'],
  entreprises: ['app/entreprises/page.tsx'],
  'happiness-design': ['app/happiness-design/page.tsx'],
  relations: ['app/relations/page.tsx'],
  'sparring-partner': ['app/sparring-partner/page.tsx'],
  booking: ['app/booking/page.tsx'],
  contact: ['app/contact/page.tsx'],
  faq: ['app/faq/page.tsx'],
  blog: ['components/BlogClientPage.tsx', 'app/blog/[slug]/page.tsx'],
  footer: ['components/Footer.tsx'],
  'mentions-legales': ['app/mentions-legales/MentionsLegalesContent.tsx'],
  'politique-confidentialite': ['app/politique-confidentialite/PolitiqueContent.tsx'],
  merci: ['app/merci/page.tsx'],
  // espace client : connexion, inscription, tableau de bord
  compte: ['app/auth/login/page.tsx', 'app/auth/register/page.tsx', 'app/dashboard/page.tsx'],
  // fil d'Ariane : libellés des maillons et affichage général
  'fil-ariane': ['components/Breadcrumb.tsx'],
  // éléments communs à tout le site : bandeau cookies, newsletter, partage, 404, maintenance
  site: [
    'components/CookieConsentBanner.tsx',
    'components/NewsletterForm.tsx',
    'components/ShareButtons.tsx',
    'app/not-found.tsx',
    'components/MaintenanceNotice.tsx',
  ],
  // test de style d'attachement (page /test-attachement et encart de /relations)
  'test-attachement': [
    'components/attachment-test/AttachmentTest.tsx',
    'components/attachment-test/QuestionCard.tsx',
    'components/attachment-test/ResultCard.tsx',
    'app/test-attachement/page.tsx',
    'lib/attachment-test/cms.ts',
  ],
}

// Les champs SEO (seo_title, seo_description, seo_image) sont lus par lib/page-seo.ts
for (const p of ['a-propos','coaching','entreprises','happiness-design','relations','sparring-partner','booking','contact','faq','blog','mentions-legales','politique-confidentialite','test-attachement']) PAGES[p].push('lib/page-seo.ts')

function adminKeys(page: string): Set<string> {
  const lines = read('app/cms-admin/page.tsx').split('\n')
  const start = lines.findIndex(l => l.startsWith('const PAGES_CONFIG'))
  const block = lines.findIndex((l, i) => i > start && new RegExp(`^  '?${page}'?: \\{\\s*$`).test(l))
  if (block < 0) throw new Error(`Page « ${page} » absente de PAGES_CONFIG`)
  const end = lines.findIndex((l, i) => i > block && /^ {2}\},\s*$/.test(l))
  return new Set([...lines.slice(block, end).join('\n').matchAll(/\{ key: '([^']+)'/g)].map(m => m[1]))
}

function defaultKeys(page: string): Set<string> {
  const txt = read(`lib/cms-defaults/${page}.ts`)
  // une clé par ligne, ou plusieurs séparées par des virgules (ex. step_01_num: '01', step_01_title: '…')
  // la valeur peut être une chaîne ('…', "…", `…`) ou une constante importée partagée (DEFAULT_CONTACT_EMAIL)
  return new Set(
    [...txt.matchAll(/(?:^|,)\s*['"]?([A-Za-z0-9_]+)['"]?\s*:\s*(?:["'`]|[A-Za-z_$])/gm)].map(m => m[1]),
  )
}

/** Clés lues par le code : littérales (c.get('x'), c.x, c['x']) et gabarits (`prefix_${i}_suffix`). */
function readKeys(files: string[]) {
  const text = files.map(read).join('\n')
  const literal = new Set<string>()
  for (const m of text.matchAll(/\bc\.get\(\s*['"`]([A-Za-z0-9_]+)['"`]/g)) literal.add(m[1])
  for (const m of text.matchAll(/\bc\[\s*['"`]([A-Za-z0-9_]+)['"`]\s*\]/g)) literal.add(m[1])
  for (const m of text.matchAll(/\bc\.([A-Za-z_][A-Za-z0-9_]*)\b/g)) if (!['get', 'content'].includes(m[1])) literal.add(m[1])
  const templates = [...text.matchAll(/`([^`$]*)\$\{[^}]*\}([^`]*)`/g)].map(m => [m[1], m[2]] as [string, string])
  return { literal, templates, text }
}

describe.each(Object.entries(PAGES))('CMS — page « %s »', (page, files) => {
  const admin = adminKeys(page)
  const defaults = defaultKeys(page)
  const { literal, templates, text } = readKeys(files)

  it('tout texte lu par la page a un champ dans l’admin', () => {
    const missing = [...literal].filter(k => !admin.has(k))
    expect(missing, `Clés lues par ${files.join(', ')} mais absentes de PAGES_CONFIG.${page}`).toEqual([])
  })

  it('tout champ de l’admin a une valeur par défaut', () => {
    const missing = [...admin].filter(k => !defaults.has(k))
    expect(missing, `Champs de PAGES_CONFIG.${page} sans défaut dans lib/cms-defaults/${page}.ts`).toEqual([])
  })

  it('tout champ de l’admin est lu par la page (aucun champ sans effet)', () => {
    const covered = (k: string) =>
      new RegExp(`(?<![A-Za-z0-9_])${k}(?![A-Za-z0-9_])`).test(text) ||
      templates.some(([p, s]) => (p || s) && k.startsWith(p) && k.endsWith(s) && k.length > p.length + s.length)
    const dead = [...admin].filter(k => !covered(k))
    expect(dead, `Champs de PAGES_CONFIG.${page} que ${files.join(', ')} ne lit jamais`).toEqual([])
  })
})

describe('CMS — listes répétables', () => {
  it('chaque champ « list » de l’admin a une définition dans lib/cms-lists.ts', () => {
    const admin = read('app/cms-admin/page.tsx')
    const keys = [...admin.matchAll(/\{ key: '([^']+)',[^}]*type: 'list'/g)].map(m => m[1])
    expect(keys.length).toBeGreaterThanOrEqual(6)
    expect(keys.filter(k => !LIST_DEFS[k])).toEqual([])
  })
})
