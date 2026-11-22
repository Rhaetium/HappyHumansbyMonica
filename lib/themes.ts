// ── Thèmes visuels du site — SOURCE UNIQUE ──────────────────────────
// Utilisé côté serveur (app/layout.tsx : injection SSR sans flash) ET côté
// client (components/DynamicTheme.tsx : aperçu brouillon). Ne jamais dupliquer
// ces valeurs ailleurs : toute nouvelle couleur passe par buildThemeCSS().
//
// Chaque thème peut recommander un pack d'illustrations (lib/theme-packs.ts).

export type ThemeTokens = {
  label: string;
  primary: string; dark: string; light: string;
  accent: string; accentLight: string;
  bg: string; bgCard: string; text: string;
  font: string;
  fontHeading: string;
  fontBody: string;
  /** Pack d'illustrations recommandé (clé de THEME_PACKS). */
  pack: string;
};

/**
 * Choix de polices proposés dans le CMS (admin → Paramètres → Thème & Couleurs).
 * `google` = famille + graisses pour Google Fonts ; sans cette clé, la police est déjà chargée ailleurs
 * (globals.css) ou fournie par le système. Les identifiants (id) sont enregistrés dans les réglages : ne pas les renommer.
 */
export type FontChoice = { id: string; label: string; stack: string; google?: string };

export const FONT_CHOICES: FontChoice[] = [
  { id: 'cormorant', label: 'Cormorant Garamond (serif élégant)', stack: "'Cormorant Garamond', 'Playfair Display', serif", google: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500' },
  { id: 'playfair', label: 'Playfair Display (serif affirmé)', stack: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500' },
  { id: 'inter', label: 'Inter (sans-serif lisible)', stack: "'Inter', system-ui, sans-serif", google: 'Inter:wght@300;400;500;600;700' },
  { id: 'georgia', label: 'Georgia (serif système)', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'system', label: 'Système (sans-serif natif)', stack: "system-ui, -apple-system, sans-serif" },
  // Charte graphique Happy Humans : Comfortaa pour le logo et les titres, Montserrat pour les sous-titres et les textes
  { id: 'comfortaa', label: 'Comfortaa — charte Happy Humans (logo & titres)', stack: "'Comfortaa', 'Quicksand', system-ui, sans-serif", google: 'Comfortaa:wght@300;400;500;600;700' },
  { id: 'montserrat', label: 'Montserrat — charte Happy Humans (sous-titres & textes)', stack: "'Montserrat', system-ui, sans-serif", google: 'Montserrat:wght@300;400;500;600;700' },
  // Autres polices proches de la charte
  { id: 'quicksand', label: 'Quicksand (arrondie, douce)', stack: "'Quicksand', 'Comfortaa', system-ui, sans-serif", google: 'Quicksand:wght@400;500;600;700' },
  { id: 'nunito', label: 'Nunito (arrondie, très lisible)', stack: "'Nunito', system-ui, sans-serif", google: 'Nunito:wght@300;400;600;700' },
  { id: 'poppins', label: 'Poppins (moderne, géométrique)', stack: "'Poppins', system-ui, sans-serif", google: 'Poppins:wght@300;400;500;600;700' },
  { id: 'dm-sans', label: 'DM Sans (nette et sobre)', stack: "'DM Sans', system-ui, sans-serif", google: 'DM+Sans:wght@300;400;500;600;700' },
  { id: 'lora', label: 'Lora (serif chaleureux)', stack: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  // Polices supplémentaires (Google Fonts)
  { id: 'merriweather', label: 'Merriweather (serif de lecture, très lisible)', stack: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,400' },
  { id: 'source-serif', label: 'Source Serif 4 (serif sobre, éditorial)', stack: "'Source Serif 4', Georgia, serif", google: 'Source+Serif+4:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'fraunces', label: 'Fraunces (serif doux et expressif)', stack: "'Fraunces', Georgia, serif", google: 'Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'work-sans', label: 'Work Sans (sans-serif neutre)', stack: "'Work Sans', system-ui, sans-serif", google: 'Work+Sans:wght@300;400;500;600;700' },
  { id: 'open-sans', label: 'Open Sans (sans-serif classique, très lisible)', stack: "'Open Sans', system-ui, sans-serif", google: 'Open+Sans:wght@300;400;500;600;700' },
  { id: 'raleway', label: 'Raleway (élégante, fine)', stack: "'Raleway', system-ui, sans-serif", google: 'Raleway:wght@300;400;500;600;700' },
  { id: 'josefin', label: 'Josefin Sans (géométrique, élégante)', stack: "'Josefin Sans', system-ui, sans-serif", google: 'Josefin+Sans:wght@300;400;500;600;700' },
  { id: 'caveat', label: 'Caveat (écriture manuscrite, pour les titres)', stack: "'Caveat', cursive", google: 'Caveat:wght@400;500;600;700' },
];

/**
 * Polices toujours chargées : Cormorant et Inter (titres et texte de base, voir globals.css) et Playfair Display
 * (classe Tailwind `font-serif` : prix, guillemets, initiales). Les autres ne sont chargées que si le thème les choisit.
 */
const BASE_FONT_IDS = ['cormorant', 'inter', 'playfair'];

const firstFamily = (stack: string) => stack.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();

/**
 * Adresse de la feuille Google Fonts de CETTE page : les polices de base + celles du thème (titres, texte).
 * Avant, les 9 polices proposées dans le CMS étaient chargées sur chaque page (93 Ko de CSS qui bloquent l'affichage)
 * alors que le thème n'en utilise que deux. Un thème qui change de police voit la sienne ajoutée automatiquement.
 */
export function googleFontsHref(tokens: Pick<ThemeTokens, 'font' | 'fontHeading' | 'fontBody'>): string {
  const used = new Set([tokens.font, tokens.fontHeading, tokens.fontBody].filter(Boolean).map(firstFamily));
  const families = FONT_CHOICES
    .filter(f => f.google && (BASE_FONT_IDS.includes(f.id) || used.has(firstFamily(f.stack))))
    .map(f => 'family=' + f.google);
  return 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap';
}

/**
 * Police Google Fonts libre, saisie par son nom dans l'admin : identifiant « google:Nom de la police ».
 * Le nom est limité à des lettres, chiffres et espaces : il finit dans une adresse et dans du CSS, rien d'autre n'est accepté.
 */
export const CUSTOM_FONT_PREFIX = 'google:';
const CUSTOM_FAMILY = /^[A-Za-z][A-Za-z0-9 ]{1,39}$/;

/** Nom de famille valide d'après ce que saisit Monica (« poppins », « Playfair  Display »…), ou '' si invalide. */
export function cleanFontFamily(raw: string | undefined): string {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim();
  return CUSTOM_FAMILY.test(name) ? name : '';
}

export function customFamilyOf(id: string | undefined): string {
  return id && id.startsWith(CUSTOM_FONT_PREFIX) ? cleanFontFamily(id.slice(CUSTOM_FONT_PREFIX.length)) : '';
}

export function fontStack(id: string | undefined, fallback: string): string {
  const found = FONT_CHOICES.find(f => f.id === id);
  if (found) return found.stack;
  const custom = customFamilyOf(id);
  return custom ? `'${custom}', system-ui, sans-serif` : fallback;
}

/**
 * Feuille Google Fonts des polices libres (hors liste) utilisées par le thème, ou null s'il n'y en a pas.
 * Feuille séparée : un nom de police inconnu de Google ne doit pas empêcher le chargement des autres polices.
 */
export function customFontsHref(ids: (string | undefined)[]): string | null {
  const families = [...new Set(ids.map(customFamilyOf).filter(Boolean))];
  if (!families.length) return null;
  return 'https://fonts.googleapis.com/css2?' + families.map(f => 'family=' + f.replace(/ /g, '+') + ':wght@300;400;500;600;700').join('&') + '&display=swap';
}

export const DEFAULT_PRESET = 'forest';
export const DEFAULT_PACK = 'cactus-nuit';

export const THEMES: Record<string, ThemeTokens> = {
  forest: {
    label: 'Forêt',
    primary: '#2d5f54', dark: '#1e3a34', light: '#4a9e8a',
    accent: '#c9a96e', accentLight: '#e8d5a3',
    bg: '#f5f0e8', bgCard: '#faf9f7', text: '#1a1a1a',
    font: "'Cormorant Garamond', 'Playfair Display', serif",
    fontHeading: "'Cormorant Garamond', 'Playfair Display', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  // ── Tirés de « prez for SFL v4.1 » (titres verts, fond blanc cassé, rose des fleurs, noir) ──
  cactus: {
    label: 'Cactus',
    primary: '#3f7a1f', dark: '#1c2b12', light: '#6aa544',
    accent: '#c2185b', accentLight: '#f9c9dc',
    bg: '#faf8f5', bgCard: '#ffffff', text: '#1c2b12',
    font: "'Cormorant Garamond', 'Playfair Display', serif",
    fontHeading: "'Cormorant Garamond', 'Playfair Display', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  desert: {
    label: 'Désert',
    primary: '#a05a2c', dark: '#3d2412', light: '#d08a4e',
    accent: '#c9a96e', accentLight: '#efe0c3',
    bg: '#faf5ec', bgCard: '#fffdf8', text: '#3d2412',
    font: "'Cormorant Garamond', 'Georgia', serif",
    fontHeading: "'Cormorant Garamond', 'Georgia', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  floraison: {
    label: 'Floraison',
    primary: '#2d5f54', dark: '#1e3a34', light: '#4a9e8a',
    accent: '#c2185b', accentLight: '#fce7f3',
    bg: '#fff8fb', bgCard: '#ffffff', text: '#331222',
    font: "'Cormorant Garamond', 'Georgia', serif",
    fontHeading: "'Cormorant Garamond', 'Georgia', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  nuit: {
    label: 'Nuit',
    primary: '#7fc8b8', dark: '#0b1512', light: '#a7e3d5',
    accent: '#c9a96e', accentLight: '#4a3d22',
    bg: '#101615', bgCard: '#1a2422', text: '#f2ede6',
    font: "'Cormorant Garamond', 'Playfair Display', serif",
    fontHeading: "'Cormorant Garamond', 'Playfair Display', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  sauge: {
    label: 'Sauge',
    primary: '#5f7a61', dark: '#33463a', light: '#9db8a4',
    accent: '#c9a96e', accentLight: '#efe3cb',
    bg: '#f2f4ef', bgCard: '#ffffff', text: '#2c3a30',
    font: "'Cormorant Garamond', 'Georgia', serif",
    fontHeading: "'Cormorant Garamond', 'Georgia', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  ocean: {
    label: 'Océan',
    primary: '#1e3a5f', dark: '#0f1e30', light: '#2563eb',
    accent: '#60a5fa', accentLight: '#bfdbfe',
    bg: '#f0f4ff', bgCard: '#f8faff', text: '#0f172a',
    font: "'Cormorant Garamond', 'Georgia', serif",
    fontHeading: "'Cormorant Garamond', 'Georgia', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  terre: {
    label: 'Terre',
    primary: '#7c3d12', dark: '#431407', light: '#b45309',
    accent: '#d97706', accentLight: '#fde68a',
    bg: '#fdf8f0', bgCard: '#fffbf5', text: '#1c0a00',
    font: "'Cormorant Garamond', 'Georgia', serif",
    fontHeading: "'Cormorant Garamond', 'Georgia', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  ardoise: {
    label: 'Ardoise',
    primary: '#1e293b', dark: '#0f172a', light: '#334155',
    accent: '#94a3b8', accentLight: '#e2e8f0',
    bg: '#f8fafc', bgCard: '#ffffff', text: '#0f172a',
    font: "'Cormorant Garamond', 'Georgia', serif",
    fontHeading: "'Cormorant Garamond', 'Georgia', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
  rose: {
    label: 'Rose',
    primary: '#9d174d', dark: '#5b0a2e', light: '#be185d',
    accent: '#f9a8d4', accentLight: '#fce7f3',
    bg: '#fff0f6', bgCard: '#fff8fb', text: '#1a0010',
    font: "'Cormorant Garamond', 'Georgia', serif",
    fontHeading: "'Cormorant Garamond', 'Georgia', serif",
    fontBody: "'Inter', system-ui, sans-serif",
    pack: 'cactus-nuit',
  },
};

export type ThemeOverrides = {
  primary?: string; dark?: string; light?: string; accent?: string;
  bg?: string; bgCard?: string; text?: string;
  fontHeading?: string; fontBody?: string;
};

/** Preset + surcharges manuelles (clés cms_settings_kv theme_*). */
export function resolveTheme(
  preset: string | undefined,
  overrides: ThemeOverrides = {},
): { id: string; tokens: ThemeTokens } {
  const id = (preset && THEMES[preset]) ? preset : DEFAULT_PRESET;
  const base = THEMES[id];
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  const pick = (v: string | undefined, fallback: string) => clean(v) ?? fallback;
  return {
    id,
    tokens: {
      ...base,
      primary: pick(overrides.primary, base.primary),
      dark: pick(overrides.dark, base.dark),
      light: pick(overrides.light, base.light),
      accent: pick(overrides.accent, base.accent),
      bg: pick(overrides.bg, base.bg),
      bgCard: pick(overrides.bgCard, base.bgCard),
      text: pick(overrides.text, base.text),
      fontHeading: fontStack(overrides.fontHeading, base.fontHeading),
      fontBody: fontStack(overrides.fontBody, base.fontBody),
    },
  };
}

/**
 * CSS qui applique le thème par-dessus les classes Tailwind générées.
 * Injecté côté serveur (sans flash) et réutilisé côté client (aperçu).
 */
export function buildThemeCSS(t: ThemeTokens): string {
  return `
:root {
  --hh-primary: ${t.primary};
  --hh-dark: ${t.dark};
  --hh-light: ${t.light};
  --hh-accent: ${t.accent};
  --hh-accent-light: ${t.accentLight};
  --hh-bg: ${t.bg};
  --hh-bg-card: ${t.bgCard};
  --hh-text: ${t.text};
  --hh-font: ${t.fontHeading};
}
body { background-color: ${t.bg} !important; color: ${t.text} !important; font-family: ${t.fontBody} !important; }
h1, h2, h3, h4, h5, h6 { font-family: ${t.fontHeading} !important; }

/* Primary backgrounds (toutes les variantes utilisées sur le site) */
.bg-\\[\\#2d5f54\\],.bg-\\[\\#2f6b61\\],.bg-\\[\\#235249\\],.bg-\\[\\#2e4f4f\\] { background-color: ${t.primary} !important; }
.bg-\\[\\#1e3a34\\] { background-color: ${t.dark} !important; }
.bg-\\[\\#f5f0e8\\],.bg-\\[\\#f5f3ef\\],.bg-\\[\\#f8f4ef\\],.bg-\\[\\#faf9f7\\],.bg-\\[\\#faf8f5\\],.bg-\\[\\#eef5f3\\],.bg-\\[\\#eef4f3\\] { background-color: ${t.bg} !important; }

/* Primary text */
.text-\\[\\#2d5f54\\],.text-\\[\\#2f6b61\\],.text-\\[\\#01696f\\],.text-\\[\\#006d77\\],.text-\\[\\#2e4f4f\\] { color: ${t.primary} !important; }

/* Accent */
.text-\\[\\#c9a96e\\] { color: ${t.accent} !important; }
.bg-\\[\\#c9a96e\\] { background-color: ${t.accent} !important; }
.text-\\[\\#e8d5b0\\] { color: ${t.accentLight} !important; }
.bg-\\[\\#e8d5b0\\] { background-color: ${t.accentLight} !important; }

/* Borders */
.border-\\[\\#2d5f54\\],.border-\\[\\#2f6b61\\],.border-\\[\\#2e4f4f\\] { border-color: ${t.primary} !important; }

/* Hover via focus */
.hover\\:bg-\\[\\#1e3a34\\]:hover,.hover\\:bg-\\[\\#235249\\]:hover,.hover\\:bg-\\[\\#1a2f2f\\]:hover { background-color: ${t.dark} !important; }

/* Inline style override via data-theme */
[data-hh-primary] { color: ${t.primary} !important; }
[data-hh-bg-primary] { background-color: ${t.primary} !important; }
[data-hh-accent] { color: ${t.accent} !important; }
[data-hh-bg] { background-color: ${t.bg} !important; }
`.trim();
}
