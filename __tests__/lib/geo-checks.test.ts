import { describe, it, expect } from 'vitest'
import { geoChecks, isBotBlocked, parseRobots } from '@/lib/geo-checks'
import { buildRobotsRules } from '@/lib/robots-rules'

const LLMS = 'x'.repeat(400)
const HOME = '<html><head><script type="application/ld+json">{}</script></head><body><h1>Coaching</h1></body></html>'
const OPEN = 'User-agent: *\nAllow: /\nDisallow: /api/\n'
const ids = (c: { id: string; level: string }[]) => c.filter(x => x.level !== 'ok').map(x => x.id)

describe('parseRobots / isBotBlocked', () => {
  it('lit un groupe avec plusieurs User-agent', () => {
    const g = parseRobots('User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /\n')
    expect(isBotBlocked(g, 'GPTBot')).toBe(true)
    expect(isBotBlocked(g, 'ClaudeBot')).toBe(true)
    expect(isBotBlocked(g, 'Googlebot')).toBe(false)
  })
  it('un groupe dédié prime sur « * »', () => {
    const g = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: PerplexityBot\nDisallow: /api/\n')
    expect(isBotBlocked(g, 'PerplexityBot')).toBe(false)
    expect(isBotBlocked(g, 'OAI-SearchBot')).toBe(true)
  })
  it('« Disallow: » vide et commentaires n’interdisent rien', () => {
    expect(isBotBlocked(parseRobots('User-agent: *\nDisallow: # rien\n'), 'GPTBot')).toBe(false)
  })
})

describe('geoChecks', () => {
  it('ne signale rien quand tout est en place', () => {
    expect(ids(geoChecks({ robotsTxt: OPEN, llmsTxt: LLMS, homeHtml: HOME }))).toEqual([])
  })
  it('détecte Google bloqué', () => {
    expect(ids(geoChecks({ robotsTxt: 'User-agent: *\nDisallow: /\n', llmsTxt: LLMS, homeHtml: HOME }))).toContain('geo-google-blocked')
  })
  it('détecte les assistants IA bloqués par le réglage du CMS', () => {
    const rules = buildRobotsRules(['/api/'], { ai_search_bots: 'false' })
    const txt = rules.map(r => `User-agent: ${[r.userAgent].flat().join('\nUser-agent: ')}\n${[r.disallow ?? []].flat().map(d => `Disallow: ${d}`).join('\n')}`).join('\n\n')
    const res = geoChecks({ robotsTxt: txt, llmsTxt: LLMS, homeHtml: HOME })
    expect(ids(res)).toEqual(['geo-ai-blocked'])
  })
  it('signale llms.txt absent ou presque vide', () => {
    expect(ids(geoChecks({ robotsTxt: null, llmsTxt: null, homeHtml: null }))).toEqual(['geo-llms-missing'])
    expect(ids(geoChecks({ robotsTxt: null, llmsTxt: 'court', homeHtml: null }))).toEqual(['geo-llms-thin'])
  })
  it('signale noindex, absence de JSON-LD et de H1 sur l’accueil', () => {
    const bad = '<meta name="robots" content="noindex, nofollow"><body></body>'
    expect(ids(geoChecks({ robotsTxt: null, llmsTxt: LLMS, homeHtml: bad }))).toEqual(['geo-home-noindex', 'geo-home-jsonld', 'geo-home-h1'])
  })
  it('ne conclut rien quand un fichier n’a pas pu être lu (réseau coupé)', () => {
    expect(geoChecks({ robotsTxt: null, llmsTxt: LLMS, homeHtml: null }).filter(c => c.level !== 'ok')).toEqual([])
  })
})
