import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Garde-fou « les couleurs de la marque suivent le thème du CMS ».
 *
 * Monica change la palette dans l'admin (Paramètres → Thème & Couleurs). Ce changement ne s'applique que si le code public
 * utilise les variables du thème (--hh-primary, --hh-dark, --hh-bg, --hh-accent, --hh-accent-light) et non une couleur
 * écrite en dur : sinon une partie du site (survols, bordures, styles inline…) garderait l'ancienne couleur.
 *
 * Si ce test échoue : remplacez la couleur par la variable correspondante.
 *   classe Tailwind : bg-[#2d5f54]  →  bg-[color:var(--hh-primary)]   (idem text-, border-, ring-, from-, hover:…)
 *   style inline    : '#2d5f54'     →  'var(--hh-primary)'
 * Une transparence (bg-[#2d5f54]/90) ne se combine pas avec une variable : utilisez `color-mix` ou un autre style.
 */

const root = path.resolve(__dirname, '../..')

// Correspondance identique à buildThemeCSS (lib/themes.ts)
const BRAND: Record<string, string> = {
  '#2d5f54': 'primary', '#2f6b61': 'primary', '#235249': 'primary', '#2e4f4f': 'primary', '#01696f': 'primary', '#006d77': 'primary',
  '#1e3a34': 'dark', '#1a2f2f': 'dark',
  '#f5f0e8': 'bg', '#f5f3ef': 'bg', '#f8f4ef': 'bg', '#faf9f7': 'bg', '#faf8f5': 'bg', '#eef5f3': 'bg', '#eef4f3': 'bg', '#f7f4ef': 'bg',
  '#c9a96e': 'accent', '#e8d5b0': 'accent-light',
}

// Hors périmètre : admin, API, layout global (valeurs de secours), éditeurs, et les illustrations SVG (logo, filtre duotone)
// dont les couleurs sont des attributs/valeurs numériques.
const SKIP_FILE = /(^app\/(cms-admin|api)\/|^app\/layout\.tsx$|^components\/(cms|admin)\/|Editor|MediaLibrary|EditableImage|LogoSVG|DuotoneFilter)/

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.tsx$/.test(e.name)) out.push(p)
  }
  return out
}

describe('CMS — les couleurs de la marque suivent le thème', () => {
  it('aucune couleur de la marque écrite en dur dans le code public', () => {
    const offenders: string[] = []
    for (const file of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))]) {
      const rel = path.relative(root, file).split(path.sep).join('/')
      if (SKIP_FILE.test(rel)) continue
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        const l = line.trim()
        if (l.startsWith('//') || l.startsWith('*') || l.startsWith('{/*')) return
        if (/(fill|stroke|stopColor|stop-color)=["']#/.test(l)) return // attribut SVG décoratif
        for (const m of l.matchAll(/(?<![\w#])(#[0-9a-fA-F]{6})(?![0-9a-fA-F\w])/g)) {
          const hex = m[1].toLowerCase()
          if (BRAND[hex]) offenders.push(`${rel}:${i + 1} → ${hex} : utilisez var(--hh-${BRAND[hex]})`)
        }
      })
    }
    expect(offenders, `Couleur(s) de la marque en dur :\n${offenders.join('\n')}`).toEqual([])
  })
})
