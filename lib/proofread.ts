// Correction d'orthographe d'un article : l'IA ne réécrit PAS le texte, elle liste des corrections précises
// (« recomandé » → « recommandé »). Chaque correction est vérifiée (le mot fautif existe vraiment dans le texte, la
// correction reste petite) puis appliquée seulement dans le TEXTE de l'article, jamais dans les balises ni les adresses.
// Monica coche ce qu'elle accepte. Logique pure, testée dans __tests__/lib/proofread.test.ts.

import { plainText } from '@/lib/article-seo-ai'

export const MAX_CORRECTIONS = 30
const MAX_LEN = 80

export type Correction = { from: string; to: string; reason: string }

export const PROOFREAD_SYSTEM = `Tu relis un article de blog en français (site de coaching Happy Humans, ton chaleureux, au « vous »).
Repère uniquement les vraies fautes : orthographe, accords, conjugaison, ponctuation française (espaces avant « : ; ? ! »), mots répétés par erreur.
Ne reformule rien, ne change pas le style, les choix de mots ni le sens. Ne corrige pas les noms propres ni les mots anglais voulus.
Réponds par UN SEUL objet JSON, sans texte autour : {"corrections":[{"from":"extrait EXACT du texte fautif","to":"même extrait corrigé","reason":"explication en quelques mots"}]}
« from » doit être copié tel quel dans le texte (quelques mots au plus, avec juste assez de contexte pour être unique). S'il n'y a aucune faute : {"corrections":[]}.`

export function buildProofreadPrompt(content: string): string {
  return `Texte de l'article :\n${plainText(content, 6000)}`
}

/** Corrections valides : le texte fautif existe dans l'article, la correction est différente et courte. */
export function parseCorrections(raw: string, content: string): Correction[] {
  const text = raw.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) return []
  let data: { corrections?: unknown }
  try { data = JSON.parse(body.slice(start, end + 1)) } catch { return [] }
  if (!Array.isArray(data.corrections)) return []
  const flat = textSegments(content).join('\n')
  const seen = new Set<string>()
  const out: Correction[] = []
  for (const c of data.corrections) {
    if (out.length >= MAX_CORRECTIONS) break
    const item = c as { from?: unknown; to?: unknown; reason?: unknown }
    if (typeof item?.from !== 'string' || typeof item.to !== 'string') continue
    const from = item.from, to = item.to
    if (!from.trim() || from === to || from.length > MAX_LEN || to.length > MAX_LEN) continue
    if (Math.abs(from.length - to.length) > 12 || /[<>]/.test(to)) continue // petite correction, jamais de balise
    if (!flat.includes(from) || seen.has(from)) continue
    seen.add(from)
    out.push({ from, to, reason: typeof item.reason === 'string' ? item.reason.trim().slice(0, 120) : '' })
  }
  return out
}

const TAG_SPLIT = /(<[^>]*>)/g

function textSegments(html: string): string[] {
  return html.split(TAG_SPLIT).filter((s, i) => i % 2 === 0 && s !== '')
}

/** Applique les corrections au HTML, dans le texte seulement (la première occurrence de chacune). */
export function applyCorrections(html: string, corrections: Correction[]): { html: string; applied: number } {
  const parts = html.split(TAG_SPLIT)
  let applied = 0
  for (const c of corrections) {
    for (let i = 0; i < parts.length; i += 2) { // indices pairs = texte, impairs = balises
      const at = parts[i].indexOf(c.from)
      if (at !== -1) {
        parts[i] = parts[i].slice(0, at) + c.to + parts[i].slice(at + c.from.length)
        applied++
        break
      }
    }
  }
  return { html: parts.join(''), applied }
}
