// ── Typographie et lisibilité du site — SOURCE UNIQUE ───────────────
// Un « gabarit de style » (TYPO_TEMPLATES) regroupe polices, taille, graisse et interligne ; chaque réglage peut
// ensuite être ajusté un par un dans l'admin (Paramètres → Thème & Couleurs → Typographie). Réglage vide = celui du gabarit.
// Utilisé côté serveur (app/layout.tsx, sans flash) et côté client (components/DynamicTheme.tsx).
// Fonctions pures, testées dans __tests__/lib/typography.test.ts.

import { CUSTOM_FONT_PREFIX, cleanFontFamily } from '@/lib/themes'

export type TypoSettings = {
  /** Police des titres (id de FONT_CHOICES). */
  fontHeading: string
  /** Police du texte (id de FONT_CHOICES). */
  fontBody: string
  /** Taille du texte : de 15 px (petit) à 20 px (très grand), 16 px par défaut. */
  size: 'petit' | 'normal' | 'confort' | 'grand' | 'tres-grand'
  /** Graisse du texte courant (300 fin, 400 normal, 500 appuyé). */
  weight: '300' | '400' | '500'
  /** Interligne du texte (1.5 serré, 1.65 aéré, 1.8 très aéré). */
  lineHeight: '1.5' | '1.65' | '1.8'
  /** Graisse des titres. */
  headingWeight: '400' | '500' | '600' | '700'
  /** Étiquettes en capitales espacées : 'keep' les garde, 'soft' les repasse en casse normale (plus chaleureux). */
  caps: 'keep' | 'soft'
}

export type TypoTemplate = { id: string; label: string; description: string; settings: TypoSettings }

export const TYPO_TEMPLATES: TypoTemplate[] = [
  {
    id: 'humain', label: 'Chaleureux',
    description: 'Titres serif doux, texte arrondi, grande taille, bien aéré : le plus lisible et le plus humain.',
    settings: { fontHeading: 'lora', fontBody: 'nunito', size: 'confort', weight: '400', lineHeight: '1.65', headingWeight: '600', caps: 'soft' },
  },
  {
    id: 'charte', label: 'Charte Happy Humans',
    description: 'Comfortaa pour les titres, Montserrat pour le texte : les polices du logo et de la charte graphique.',
    settings: { fontHeading: 'comfortaa', fontBody: 'montserrat', size: 'confort', weight: '400', lineHeight: '1.65', headingWeight: '700', caps: 'soft' },
  },
  {
    id: 'editorial', label: 'Éditorial',
    description: 'Serif partout, comme un livre ou un magazine : idéal pour lire de longs articles.',
    settings: { fontHeading: 'lora', fontBody: 'lora', size: 'grand', weight: '400', lineHeight: '1.8', headingWeight: '600', caps: 'soft' },
  },
  {
    id: 'sobre', label: 'Sobre et net',
    description: 'DM Sans partout, graisses franches : moderne, très clair, sans fioritures.',
    settings: { fontHeading: 'dm-sans', fontBody: 'dm-sans', size: 'confort', weight: '400', lineHeight: '1.65', headingWeight: '600', caps: 'soft' },
  },
  {
    id: 'classique', label: 'Classique (ancien style)',
    description: 'Cormorant en capitales fines et Inter léger : le style d’origine du site, plus fin et plus dense.',
    settings: { fontHeading: 'cormorant', fontBody: 'inter', size: 'normal', weight: '300', lineHeight: '1.5', headingWeight: '400', caps: 'keep' },
  },
]

export const DEFAULT_TYPO_TEMPLATE = 'humain'

/** Clés cms_settings_kv lues pour la typographie (aussi chargées par l'aperçu côté client). */
export const TYPO_SETTING_KEYS = [
  'theme_typo', 'theme_font_heading', 'theme_font_body', 'theme_font_heading_custom', 'theme_font_body_custom',
  'theme_text_size', 'theme_text_weight', 'theme_line_height', 'theme_heading_weight', 'theme_caps',
] as const

export const SIZE_PERCENT: Record<TypoSettings['size'], number> = { petit: 93.75, normal: 100, confort: 106.25, grand: 112.5, 'tres-grand': 125 }

export const TYPO_OPTIONS = {
  size: [['petit', 'Petite (15 px)'], ['normal', 'Normale (16 px)'], ['confort', 'Confortable (17 px)'], ['grand', 'Grande (18 px)'], ['tres-grand', 'Très grande (20 px)']],
  weight: [['300', 'Fin'], ['400', 'Normal'], ['500', 'Appuyé']],
  lineHeight: [['1.5', 'Serré'], ['1.65', 'Aéré'], ['1.8', 'Très aéré']],
  headingWeight: [['400', 'Fin'], ['500', 'Moyen'], ['600', 'Semi-gras'], ['700', 'Gras']],
  caps: [['keep', 'Capitales espacées (style d’origine)'], ['soft', 'Casse normale (plus chaleureux)']],
} as const

export function templateById(id: string | undefined): TypoTemplate {
  return TYPO_TEMPLATES.find(t => t.id === id) ?? TYPO_TEMPLATES.find(t => t.id === DEFAULT_TYPO_TEMPLATE)!
}

const oneOf = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T => {
  const v = (value ?? '').trim()
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

/** Gabarit choisi + réglages individuels (vide ou invalide = valeur du gabarit). */
export function resolveTypography(kv: Record<string, string | undefined>): { template: string; settings: TypoSettings } {
  const tpl = templateById(kv.theme_typo)
  const t = tpl.settings
  // Police libre (nom Google Fonts saisi) > police choisie dans la liste > police du gabarit
  const font = (custom: string | undefined, listed: string | undefined, fallback: string) => {
    const family = cleanFontFamily(custom)
    if (family) return CUSTOM_FONT_PREFIX + family
    return listed && listed.trim() ? listed.trim() : fallback
  }
  return {
    template: tpl.id,
    settings: {
      fontHeading: font(kv.theme_font_heading_custom, kv.theme_font_heading, t.fontHeading),
      fontBody: font(kv.theme_font_body_custom, kv.theme_font_body, t.fontBody),
      size: oneOf(kv.theme_text_size, ['petit', 'normal', 'confort', 'grand', 'tres-grand'], t.size),
      weight: oneOf(kv.theme_text_weight, ['300', '400', '500'], t.weight),
      lineHeight: oneOf(kv.theme_line_height, ['1.5', '1.65', '1.8'], t.lineHeight),
      headingWeight: oneOf(kv.theme_heading_weight, ['400', '500', '600', '700'], t.headingWeight),
      caps: oneOf(kv.theme_caps, ['keep', 'soft'], t.caps),
    },
  }
}

/**
 * CSS de lisibilité, injecté après celui du thème. La taille de base passe par `html` : tout le site (rem) suit.
 * Les valeurs viennent de listes fermées (jamais de texte libre), donc rien à échapper.
 */
export function buildTypographyCSS(s: TypoSettings): string {
  const rules = [
    `html { font-size: ${SIZE_PERCENT[s.size]}% !important; }`,
    `:root { --hh-body-weight: ${s.weight}; --hh-line-height: ${s.lineHeight}; --hh-heading-weight: ${s.headingWeight}; }`,
    `body { font-weight: ${s.weight} !important; line-height: ${s.lineHeight}; }`,
    `main p, main li, article p, article li { line-height: ${s.lineHeight} !important; }`,
    `h1, h2, h3, h4, h5, h6 { font-weight: ${s.headingWeight} !important; }`,
    // Les textes mis en « light » dans les pages suivent la graisse choisie (sauf titres, réglés au-dessus)
    `.font-light:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6) { font-weight: ${s.weight} !important; }`,
  ]
  if (s.caps === 'soft') {
    rules.push('.uppercase:not(.display-title) { text-transform: none !important; letter-spacing: 0.01em !important; }')
  }
  return rules.join('\n')
}
