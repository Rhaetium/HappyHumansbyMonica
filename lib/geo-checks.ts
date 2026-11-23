// Contrôle de ce que Google et les assistants IA lisent réellement sur le site en ligne
// (robots.txt, llms.txt, page d'accueil), pour le tableau de bord. Fonctions pures, testées
// dans __tests__/lib/geo-checks.test.ts : la route ne fait que télécharger les fichiers.

import type { HealthCheck } from '@/lib/cms-health'
import { AI_ANSWER_BOTS } from '@/lib/robots-rules'

/** llms.txt plus court que ça ne décrit rien : le fichier est présent mais vide de sens. */
export const LLMS_MIN_CHARS = 300

type Group = { agents: string[]; disallow: string[] }

/** Découpe un robots.txt en groupes (User-agent + règles). Les commentaires sont ignorés. */
export function parseRobots(txt: string): Group[] {
  const groups: Group[] = []
  let cur: Group | null = null
  let lastWasAgent = false
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], disallow: [] }; groups.push(cur) }
      cur.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      if (key === 'disallow' && cur && value) cur.disallow.push(value)
      lastWasAgent = false
    }
  }
  return groups
}

/** Ce robot est-il interdit sur tout le site ? Son groupe dédié prime sur « * ». */
export function isBotBlocked(groups: Group[], bot: string): boolean {
  const own = groups.filter(g => g.agents.includes(bot.toLowerCase()))
  const applicable = own.length ? own : groups.filter(g => g.agents.includes('*'))
  return applicable.some(g => g.disallow.includes('/'))
}

export type GeoInput = {
  /** Contenu de /robots.txt, ou null s'il n'a pas pu être lu. */
  robotsTxt: string | null
  /** Contenu de /llms.txt, ou null s'il n'a pas pu être lu. */
  llmsTxt: string | null
  /** HTML de la page d'accueil, ou null s'il n'a pas pu être lu. */
  homeHtml: string | null
}

const ok = (id: string, title: string, detail: string): HealthCheck => ({ id, level: 'ok', title, detail })

export function geoChecks({ robotsTxt, llmsTxt, homeHtml }: GeoInput): HealthCheck[] {
  const checks: HealthCheck[] = []

  if (robotsTxt !== null) {
    const groups = parseRobots(robotsTxt)
    if (isBotBlocked(groups, 'Googlebot')) {
      checks.push({
        id: 'geo-google-blocked', level: 'error', title: 'Google n’a pas le droit de lire le site',
        detail: 'Le fichier robots.txt interdit tout le site aux robots de Google : le site ne peut apparaître dans aucune recherche.',
        fix: 'Vérifiez Paramètres → Visibilité des pages : une page cachée doit être l’exception, pas toutes les pages.',
      })
    }
    const blocked = AI_ANSWER_BOTS.filter(b => isBotBlocked(groups, b))
    if (blocked.length === AI_ANSWER_BOTS.length) {
      checks.push({
        id: 'geo-ai-blocked', level: 'warn', title: 'Les assistants IA ne peuvent pas citer le site',
        detail: 'ChatGPT, Claude et Perplexity n’ont pas le droit de lire le site pour répondre à leurs utilisateurs.',
        fix: 'Si ce n’est pas voulu : Paramètres → Robots IA, autorisez les robots qui répondent aux questions.',
      })
    } else if (blocked.length) {
      checks.push({
        id: 'geo-ai-partial', level: 'warn', title: 'Certains assistants IA ne peuvent pas citer le site',
        detail: `Robots bloqués : ${blocked.join(', ')}.`,
        fix: 'Si ce n’est pas voulu : Paramètres → Robots IA.',
      })
    } else {
      checks.push(ok('geo-ai-open', 'Les assistants IA peuvent lire le site', 'ChatGPT, Claude et Perplexity ont accès au site.'))
    }
  }

  if (llmsTxt === null) {
    checks.push({
      id: 'geo-llms-missing', level: 'warn', title: 'Le résumé pour assistants IA (llms.txt) est introuvable',
      detail: 'Le fichier /llms.txt ne répond pas : les assistants IA n’ont pas de résumé du site.',
      fix: 'Ouvrez /llms.txt dans votre navigateur ; si la page d’erreur s’affiche, prévenez votre développeur.',
    })
  } else if (llmsTxt.trim().length < LLMS_MIN_CHARS) {
    checks.push({
      id: 'geo-llms-thin', level: 'warn', title: 'Le résumé pour assistants IA (llms.txt) est presque vide',
      detail: `Il ne contient que ${llmsTxt.trim().length} caractères : trop peu pour décrire vos offres.`,
      fix: 'Complétez la présentation du site et vos offres dans Pages : llms.txt se remplit à partir d’elles.',
    })
  } else {
    checks.push(ok('geo-llms-ok', 'Le résumé pour assistants IA est en place', 'Le fichier llms.txt décrit le site.'))
  }

  if (homeHtml !== null) {
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(homeHtml)) {
      checks.push({
        id: 'geo-home-noindex', level: 'error', title: 'La page d’accueil demande à Google de l’ignorer',
        detail: 'Une consigne « noindex » est présente sur la page d’accueil.',
        fix: 'Vérifiez Paramètres → Visibilité des pages et le mode maintenance.',
      })
    }
    if (!/<script[^>]+application\/ld\+json/i.test(homeHtml)) {
      checks.push({
        id: 'geo-home-jsonld', level: 'warn', title: 'La page d’accueil n’a pas de données structurées',
        detail: 'Aucun balisage (JSON-LD) ne présente Happy Humans à Google et aux assistants IA.',
        fix: 'Prévenez votre développeur : le balisage de l’accueil a disparu.',
      })
    }
    const h1 = (homeHtml.match(/<h1[\s>]/gi) ?? []).length
    if (h1 !== 1) {
      checks.push({
        id: 'geo-home-h1', level: 'warn', title: h1 === 0 ? 'La page d’accueil n’a pas de titre principal' : 'La page d’accueil a plusieurs titres principaux',
        detail: `On y trouve ${h1} titre(s) de niveau 1 ; il en faut exactement un, qui dit ce que fait le site.`,
        fix: 'Pages → Accueil : vérifiez le titre du bandeau d’en-tête.',
      })
    }
  }

  return checks
}
