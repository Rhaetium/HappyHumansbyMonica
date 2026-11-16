'use client';



// ─── Longueur d'un texte pour Google ──────────────────────────
// Repère de rédaction : Google coupe le titre au-delà de ~60 caractères et la description
// au-delà de ~160. On l'affiche en direct sous le champ, sans jamais bloquer la saisie —
// un texte trop long reste enregistrable, c'est un conseil, pas une règle.
export const SEO_TITLE_IDEAL = 60;
export const SEO_DESCRIPTION_IDEAL = 160;

export function SeoLengthHint({ value, ideal, note }: { value: string; ideal: number; note?: string }) {
  const length = value.length;
  const over = length > ideal;
  return (
    <p style={{ margin: '.35rem 0 0', fontSize: '.78rem', color: over ? '#c2410c' : length === 0 ? '#aaa' : '#16a34a', fontWeight: 600 }}>
      {length} caractère{length > 1 ? 's' : ''}{note ? ` (${note})` : ''} · conseillé : jusqu’à {ideal}
      {over ? ` — Google coupera probablement la fin` : ''}
    </p>
  );
}

