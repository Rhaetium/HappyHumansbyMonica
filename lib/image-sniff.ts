// Contrôle des images envoyées dans la médiathèque. On ne se fie PAS au type annoncé par le navigateur (modifiable) :
// on lit les premiers octets du fichier. Le SVG est refusé : c'est du texte qui peut contenir du JavaScript, et il
// serait servi depuis notre propre stockage public. Logique pure, testée dans __tests__/lib/image-sniff.test.ts.

export type SniffedImage = { contentType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; ext: 'jpg' | 'png' | 'gif' | 'webp' }

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)))

/** Le vrai type d'une image (JPEG, PNG, GIF, WebP) d'après son contenu, ou null si ce n'en est pas une. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { contentType: 'image/jpeg', ext: 'jpg' }
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === 'PNG') return { contentType: 'image/png', ext: 'png' }
  if (ascii(bytes, 0, 4) === 'GIF8') return { contentType: 'image/gif', ext: 'gif' }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return { contentType: 'image/webp', ext: 'webp' }
  return null
}

export const NOT_AN_IMAGE_MESSAGE =
  'Format non accepté : utilisez une image JPEG, PNG, WebP ou GIF (le SVG n’est pas autorisé pour des raisons de sécurité).'
