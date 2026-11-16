import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Garde-fou « aucun texte en dur sur le site public ».
 *
 * Le site doit être modifiable depuis le CMS : chaque phrase visible par un visiteur vient de
 * lib/cms-defaults/<page>.ts (valeur par défaut) puis de la base (texte publié par Monica).
 * Ce test échoue dès qu'une phrase française réapparaît en dur dans une page publique.
 *
 * Si ce test échoue : déplacez le texte dans lib/cms-defaults/<page>.ts, ajoutez la clé à
 * PAGES_CONFIG (components/cms/admin/config.ts) et lisez-la avec c.get('…'). Voir docs/CMS_ARCHITECTURE.md.
 *
 * Fichiers volontairement ignorés (voir ALLOWED) : l'interface d'administration (jamais vue d'un
 * visiteur) et les métadonnées globales de app/layout.tsx, qui sont des valeurs de secours du CMS.
 */

const root = path.resolve(__dirname, '../..')

// Outils internes : barre d'édition inline, bibliothèque d'images, éditeurs, générateurs.
const ALLOWED_FILES = [
  /^app\/layout\.tsx$/, // métadonnées globales = secours du CMS (Paramètres → SEO global)
  /^app\/temoignages\//, // route fermée (404) : métadonnées inutilisées
  /^app\/cms-admin\//,
  /^app\/api\//,
  /^components\/cms\//,
  /^components\/admin\//,
  /^components\/(InlineEditor|MediaLibrary|EditableImage|RichEditor)\.tsx$/,
  /^components\/EditableField\.tsx$/,
]

// Textes assumés en dur (attributs d'accessibilité ou libellés d'outil visibles uniquement en mode édition).
const ALLOWED_STRINGS: Record<string, string[]> = {
  'components/Header.tsx': ['Modifier le menu et le logo'],
}

const FRENCH =
  /\b(le|la|les|un|une|des|du|de|pour|avec|votre|vous|nous|qui|que|est|sont|dans|sur|au|aux|et|ou|ce|cette|ses|son|sa|plus|tout|tous|pas|bien|comment|pourquoi|quand|déjà|encore|toujours|jamais|ton|tes|ta)\b/i

/** Une phrase française ? (assez longue, plusieurs mots, et soit un mot-outil, soit un accent) */
function looksFrench(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length < 12) return false
  if (!/[A-Za-zÀ-ÿ]/.test(t)) return false
  const words = t.split(' ').filter(w => /[A-Za-zÀ-ÿ]{2,}/.test(w))
  if (words.length < 3) return false
  return FRENCH.test(t) || /[àâäçéèêëîïôöùûüœ]/i.test(t)
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'artifacts'].includes(entry.name)) continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(p)
  }
  return out
}

type Finding = { file: string; line: number; text: string }

function scan(): Finding[] {
  const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]
  const findings: Finding[] = []

  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/')
    if (ALLOWED_FILES.some(re => re.test(rel))) continue
    const allowed = ALLOWED_STRINGS[rel] ?? []
    const lines = fs.readFileSync(file, 'utf8').split('\n')

    lines.forEach((line, index) => {
      const l = line.trim()
      if (!l || l.startsWith('//') || l.startsWith('*') || l.startsWith('{/*') || l.startsWith('&')) return
      // attributs techniques : jamais du contenu éditorial
      if (/(className|style|href|src|key=|data-|aria-|role=|id=|type=|import |from '|require\()/.test(l)) return

      const candidates: string[] = []
      for (const m of l.matchAll(/>([^<>{}]+)</g)) candidates.push(m[1]) // texte JSX : >Du texte<
      const sole = l.match(/^([A-ZÀ-Ý][^<>{}=;()]*[a-zà-ÿ.!?…»])[,.]?$/)
      if (sole) candidates.push(sole[1]) // texte JSX seul sur sa ligne
      for (const m of l.matchAll(/'((?:\\.|[^'\\]){12,})'|"((?:\\.|[^"\\]){12,})"/g)) candidates.push(m[1] ?? m[2]) // chaînes

      for (const candidate of candidates) {
        if (!looksFrench(candidate)) continue
        if (allowed.some(a => candidate.includes(a))) continue
        findings.push({ file: rel, line: index + 1, text: candidate.trim().slice(0, 100) })
      }
    })
  }
  return findings
}

describe('CMS — aucun texte en dur sur le site public', () => {
  it('chaque phrase visible vient du CMS', () => {
    const findings = scan()
    const report = findings.map(f => `${f.file}:${f.line} → « ${f.text} »`).join('\n')
    expect(
      findings,
      `Texte(s) en dur détecté(s) :\n${report}\n\n` +
        'Déplacez chaque texte dans lib/cms-defaults/<page>.ts + PAGES_CONFIG (components/cms/admin/config.ts), ' +
        'puis lisez-le avec c.get(\'…\').',
    ).toEqual([])
  })

  it('les adresses de contact et de réservation viennent des réglages', () => {
    // Une adresse Calendly ou un email de contact écrit dans une page ne peut pas être changé par Monica.
    const allowed = ['lib/calendly-config.ts', 'lib/site-contact.ts']
    const offenders: string[] = []
    for (const file of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
      const rel = path.relative(root, file).split(path.sep).join('/')
      if (allowed.includes(rel) || rel.startsWith('app/cms-admin/') || rel.startsWith('components/cms/admin/') || rel.startsWith('app/api/')) continue
      if (/CalendlyWidget|booking\/layout/.test(rel)) continue // le widget est configuré par les réglages
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/calendly\.com\/[a-z]/i.test(line) || /mailto:[a-z0-9._%+-]+@/i.test(line) || /happyhumans\.coaching@gmail\.com/i.test(line)) {
            offenders.push(`${rel}:${i + 1} → ${line.trim().slice(0, 90)}`)
          }
        })
    }
    expect(
      offenders,
      `Adresse(s) en dur :\n${offenders.join('\n')}\n\n` +
        'Utilisez useCalendly() (lib/calendly-config.ts) ou useSiteSettings().contact_email : ' +
        'réglages ⚙️ Paramètres → 📅 Réservation / 🌍 Général.',
    ).toEqual([])
  })
})
