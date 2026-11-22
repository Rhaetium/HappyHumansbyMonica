// Petits utilitaires de couleur. Logique pure, testée dans __tests__/lib/color.test.ts.

/** « #1e3a34 » ou « #1e3 » → [r, g, b] entre 0 et 1 ; null si ce n'est pas une couleur hexadécimale. */
export function hexToUnit(hex: string | null | undefined): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex ?? '').trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = (i: number) => Math.round((parseInt(h.slice(i, i + 2), 16) / 255) * 1000) / 1000
  return [n(0), n(2), n(4)]
}

/** Valeur de `tableValues` d'un filtre SVG « duotone » : noir → `dark`, blanc → `light`, par canal. Null si une couleur est illisible. */
export function duotoneTables(dark: string, light: string): { r: string; g: string; b: string } | null {
  const d = hexToUnit(dark)
  const l = hexToUnit(light)
  if (!d || !l) return null
  return { r: `${d[0]} ${l[0]}`, g: `${d[1]} ${l[1]}`, b: `${d[2]} ${l[2]}` }
}
