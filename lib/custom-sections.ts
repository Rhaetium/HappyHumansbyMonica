// ── Blocs personnalisés : ajouter des sections comme un vrai CMS ─────
// Chaque page peut recevoir des blocs (titre+texte+image, texte, image, CTA,
// citation) créés dans l'admin (champ `custom_sections`, éditeur dédié).
// Stockage : UNE clé de contenu par page (`custom_sections`, JSON) → brouillon,
// aperçu et publication passent par le pipeline de contenu existant.
//
// Fichier SANS dépendance (partagé par les pages, l'admin et les tests).

import { normalizeStyle, type BlockStyle } from './block-options';

export const CUSTOM_KEY = 'custom_sections';

export type SplitLayout = 'image-right' | 'image-left';
export type TextAlign = 'left' | 'center';

type BlockShape =
  | { id: string; type: 'split'; badge?: string; title: string; text: string; image: string; imageAlt?: string; ctaLabel?: string; ctaHref?: string; layout: SplitLayout }
  | { id: string; type: 'texte'; badge?: string; title?: string; text: string; align: TextAlign }
  | { id: string; type: 'image'; image: string; alt?: string; caption?: string }
  | { id: string; type: 'cta'; title: string; text?: string; button: string; href: string }
  | { id: string; type: 'citation'; quote: string; author?: string }
  | { id: string; type: 'faq'; badge?: string; title?: string; items: FaqEntry[] }
  | { id: string; type: 'liste'; badge?: string; title?: string; text: string }
  | { id: string; type: 'chiffres'; title?: string; text: string }
  | { id: string; type: 'cartes'; badge?: string; title?: string; text: string }
  | { id: string; type: 'temoignages'; title?: string; text: string }
  | { id: string; type: 'video'; url: string; title?: string; caption?: string }
  | { id: string; type: 'bouton'; label: string; href: string; align: TextAlign }
  | { id: string; type: 'espace'; size: 'petit' | 'moyen' | 'grand' };

/** Tout bloc peut recevoir des réglages avancés (fond, espacement, ancre, masquage) : voir lib/block-options.ts. */
export type CustomBlock = BlockShape & { style?: BlockStyle };

/** Une question de la FAQ d'un bloc. */
export type FaqEntry = { q: string; a: string };

export type CustomBlockType = CustomBlock['type'];

export const BLOCK_TEMPLATES: { type: CustomBlockType; label: string; emoji: string }[] = [
  { type: 'split', label: 'Titre + texte + image (disposition au choix)', emoji: '🖼️' },
  { type: 'texte', label: 'Bloc de texte', emoji: '📝' },
  { type: 'image', label: 'Image pleine largeur', emoji: '🌄' },
  { type: 'cta', label: "Appel à l'action", emoji: '📣' },
  { type: 'citation', label: 'Citation', emoji: '💬' },
  { type: 'faq', label: 'Questions fréquentes (FAQ)', emoji: '❓' },
  { type: 'liste', label: 'Liste de points', emoji: '✅' },
  { type: 'chiffres', label: 'Chiffres clés', emoji: '🔢' },
  { type: 'cartes', label: 'Cartes (3 à 4 atouts côte à côte)', emoji: '🗂️' },
  { type: 'temoignages', label: 'Témoignages', emoji: '🗣️' },
  { type: 'video', label: 'Vidéo (YouTube ou Vimeo)', emoji: '🎬' },
  { type: 'bouton', label: 'Bouton seul', emoji: '🔘' },
  { type: 'espace', label: 'Espace vide', emoji: '↕️' },
];

export function makeId(): string {
  return `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function blankBlock(type: CustomBlockType, id: string = makeId()): CustomBlock {
  switch (type) {
    case 'split': return { id, type, title: '', text: '', image: '', layout: 'image-right' };
    case 'texte': return { id, type, text: '', align: 'left' };
    case 'image': return { id, type, image: '' };
    case 'cta': return { id, type, title: '', button: '', href: '/contact' };
    case 'citation': return { id, type, quote: '' };
    case 'faq': return { id, type, title: '', items: [{ q: '', a: '' }] };
    case 'liste': return { id, type, title: '', text: '' };
    case 'chiffres': return { id, type, title: '', text: '' };
    case 'cartes': return { id, type, title: '', text: '' };
    case 'temoignages': return { id, type, title: '', text: '' };
    case 'video': return { id, type, url: '' };
    case 'bouton': return { id, type, label: '', href: '/contact', align: 'center' };
    case 'espace': return { id, type, size: 'moyen' };
  }
}

/** Liste de points : un point par ligne, lignes vides ignorées. */
export function parseListLines(text: string | undefined): string[] {
  return (text ?? '').split('\n').map(l => l.trim()).filter(Boolean);
}

/** Chiffres clés : une ligne « valeur | libellé » par chiffre (« 10 ans | d'expérience en marketing international »). */
export function parseStatLines(text: string | undefined): { value: string; label: string }[] {
  return parseListLines(text)
    .map(line => {
      const i = line.indexOf('|');
      return i < 0 ? { value: line, label: '' } : { value: line.slice(0, i).trim(), label: line.slice(i + 1).trim() };
    })
    .filter(s => s.value);
}

/** Questions valides d'un bloc FAQ (question ET réponse renseignées). */
export function validFaqItems(items: unknown): FaqEntry[] {
  if (!Array.isArray(items)) return [];
  return items
    .map(i => (i && typeof i === 'object' ? i as Record<string, unknown> : {}))
    .map(i => ({ q: typeof i.q === 'string' ? i.q.trim() : '', a: typeof i.a === 'string' ? i.a.trim() : '' }))
    .filter(i => i.q && i.a);
}

function isBlock(v: unknown): v is CustomBlock {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  return typeof b.id === 'string' && typeof b.type === 'string' &&
    BLOCK_TEMPLATES.some(t => t.type === b.type);
}

/** Lit le JSON du CMS ; invalide → [] (la page ne casse jamais). */
export function parseBlocks(json?: string | null): CustomBlock[] {
  if (!json || !json.trim()) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    // Un bloc FAQ dont la liste est absente ou abîmée garde une liste vide (la page ne casse jamais).
    return v.filter(isBlock).map(b => {
      const fixed = b.type === 'faq' && !Array.isArray((b as { items?: unknown }).items) ? { ...b, items: [] } : b;
      // Réglages avancés : seules les valeurs connues sont gardées
      const style = normalizeStyle((b as { style?: unknown }).style);
      const { style: _ignored, ...rest } = fixed as CustomBlock;
      void _ignored;
      return (style ? { ...rest, style } : rest) as CustomBlock;
    });
  } catch {
    return [];
  }
}

/** Valeur à enregistrer : '' si aucun bloc (retombe sur les défauts). */
export function serializeBlocks(blocks: CustomBlock[]): string {
  if (blocks.length === 0) return '';
  return JSON.stringify(blocks);
}

export function moveBlock(blocks: CustomBlock[], id: string, dir: -1 | 1): CustomBlock[] {
  const i = blocks.findIndex(b => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= blocks.length) return blocks;
  const next = [...blocks];
  ;[next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * Glisser-déposer : place le bloc `fromId` juste avant ou juste après le bloc `toId`.
 * Renvoie la même liste (même objet) si rien ne change : même bloc, bloc inconnu, ou déjà à cet endroit.
 */
export function reorderBlocks(blocks: CustomBlock[], fromId: string, toId: string, position: 'before' | 'after'): CustomBlock[] {
  if (fromId === toId) return blocks;
  const from = blocks.findIndex(b => b.id === fromId);
  const to = blocks.findIndex(b => b.id === toId);
  if (from < 0 || to < 0) return blocks;
  const without = blocks.filter(b => b.id !== fromId);
  const target = without.findIndex(b => b.id === toId);
  const insertAt = position === 'before' ? target : target + 1;
  const next = [...without.slice(0, insertAt), blocks[from], ...without.slice(insertAt)];
  return next.every((b, i) => b === blocks[i]) ? blocks : next;
}

/** Copie un bloc juste après l'original (nouvel identifiant, contenu copié en profondeur). */
export function duplicateBlock(blocks: CustomBlock[], id: string, newId: string = makeId()): CustomBlock[] {
  const i = blocks.findIndex(b => b.id === id);
  if (i < 0) return blocks;
  const copy = { ...JSON.parse(JSON.stringify(blocks[i])), id: newId } as CustomBlock;
  return [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
}

export function removeBlock(blocks: CustomBlock[], id: string): CustomBlock[] {
  return blocks.filter(b => b.id !== id);
}

export function updateBlock(blocks: CustomBlock[], id: string, patch: Partial<CustomBlock>): CustomBlock[] {
  return blocks.map(b => (b.id === id ? { ...b, ...patch } as CustomBlock : b));
}

/**
 * Découpe les sections natives pour insérer les blocs perso juste avant
 * l'appel à l'action final (pin 'end') quand il existe.
 * (Conservé pour compatibilité ; le rendu unifié passe par customSectionDefs.)
 */
export function splitForCustom(pinEndIds: string[], ids: string[]): { main: string[]; end: string[] } {
  const endSet = new Set(pinEndIds);
  return { main: ids.filter(id => !endSet.has(id)), end: ids.filter(id => endSet.has(id)) };
}

export const CUSTOM_ID_PREFIX = 'custom:';

/** Id de section correspondant à un bloc (utilisé dans sections_layout). */
export function customSectionId(blockId: string): string {
  return `${CUSTOM_ID_PREFIX}${blockId}`;
}

export function isCustomSectionId(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX);
}

function blockLabel(b: CustomBlock): string {
  const tpl = BLOCK_TEMPLATES.find(t => t.type === b.type);
  const name = tpl ? `${tpl.emoji} ${tpl.label}` : b.type;
  const title = ('title' in b && b.title ? String(b.title) : '') ||
    ('quote' in b && b.quote ? String(b.quote) : '');
  return `🧩 ${name}${title ? ` — ${title.slice(0, 40)}` : ''}`;
}

/**
 * Pseudo-sections pour la liste Structure : les blocs perso deviennent
 * déplaçables / masquables comme les sections natives (ni pin, donc libres).
 */
export function customSectionDefs(blocks: CustomBlock[]): { id: string; label: string }[] {
  return blocks.map(b => ({ id: customSectionId(b.id), label: blockLabel(b) }));
}
