'use client'

import { useEffect, useState } from 'react'
import { duotoneTables } from '@/lib/color'

/**
 * Filtre « duotone » de la marque : les ombres de la photo deviennent le vert foncé du thème (--hh-dark) et les hautes lumières
 * l'or du thème (--hh-accent). Défini une seule fois dans la page ; la classe .hh-duotone (globals.css) l'applique à une image.
 *
 * Un filtre SVG ne peut pas lire une variable CSS : au chargement, on lit les couleurs du thème choisi dans le CMS et on en
 * déduit les valeurs du filtre (lib/color.ts). Avant ça (rendu serveur), les valeurs du thème par défaut s'appliquent.
 */
const DEFAULT_TABLES = { r: '0.118 0.788', g: '0.227 0.663', b: '0.204 0.431' }

export default function DuotoneFilter() {
  const [t, setT] = useState(DEFAULT_TABLES)

  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    const next = duotoneTables(css.getPropertyValue('--hh-dark'), css.getPropertyValue('--hh-accent'))
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture des couleurs du thème au chargement
    if (next) setT(next)
  }, [])

  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <filter id="hh-duotone" colorInterpolationFilters="sRGB">
        {/* niveaux de gris */}
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" />
        {/* noir → vert foncé du thème, blanc → or du thème */}
        <feComponentTransfer>
          <feFuncR type="table" tableValues={t.r} />
          <feFuncG type="table" tableValues={t.g} />
          <feFuncB type="table" tableValues={t.b} />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}
