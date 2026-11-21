import { describe, it, expect } from 'vitest'
import { AI_ANSWER_BOTS, AI_TRAINING_BOTS, buildRobotsRules, isAllowed, type RobotsRule } from '@/lib/robots-rules'

const disallow = ['/cms-admin', '/api/', '/faq']
const find = (rules: RobotsRule[], bot: string) =>
  rules.find(r => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes(bot))

describe('isAllowed', () => {
  it('autorisé sauf si le réglage vaut exactement « false »', () => {
    expect(isAllowed(undefined)).toBe(true)
    expect(isAllowed('')).toBe(true)
    expect(isAllowed('true')).toBe(true)
    expect(isAllowed('false')).toBe(false)
  })
})

describe('buildRobotsRules', () => {
  it("par défaut (rien de réglé) : tous les robots IA sont autorisés, comme avant", () => {
    const rules = buildRobotsRules(disallow, {})
    expect(rules[0]).toEqual({ userAgent: '*', allow: '/', disallow })
    for (const bot of [...AI_ANSWER_BOTS, ...AI_TRAINING_BOTS]) {
      expect(find(rules, bot)).toMatchObject({ allow: ['/', '/llms.txt'], disallow })
    }
  })

  it('bloquer les robots d\'entraînement garde ceux de réponse', () => {
    const rules = buildRobotsRules(disallow, { ai_training_bots: 'false' })
    for (const bot of AI_TRAINING_BOTS) expect(find(rules, bot)).toEqual({ userAgent: AI_TRAINING_BOTS, disallow: '/' })
    for (const bot of AI_ANSWER_BOTS) expect(find(rules, bot)).toMatchObject({ allow: ['/', '/llms.txt'] })
  })

  it('bloquer les robots de réponse garde ceux d\'entraînement', () => {
    const rules = buildRobotsRules(disallow, { ai_search_bots: 'false' })
    for (const bot of AI_ANSWER_BOTS) expect(find(rules, bot)).toEqual({ userAgent: AI_ANSWER_BOTS, disallow: '/' })
    for (const bot of AI_TRAINING_BOTS) expect(find(rules, bot)).toMatchObject({ allow: ['/', '/llms.txt'] })
  })

  it('les deux bloqués : plus aucun robot IA n\'a accès, le reste du web est intact', () => {
    const rules = buildRobotsRules(disallow, { ai_search_bots: 'false', ai_training_bots: 'false' })
    expect(rules[0]).toEqual({ userAgent: '*', allow: '/', disallow })
    for (const bot of [...AI_ANSWER_BOTS, ...AI_TRAINING_BOTS]) expect(find(rules, bot)).toMatchObject({ disallow: '/' })
  })

  it('un robot n\'apparaît que dans un seul groupe (sinon le fichier devient ambigu)', () => {
    const all = [...AI_ANSWER_BOTS, ...AI_TRAINING_BOTS]
    expect(new Set(all).size).toBe(all.length)
    const rules = buildRobotsRules(disallow, {})
    for (const bot of all) {
      const count = rules.filter(r => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes(bot)).length
      expect(count, bot).toBe(1)
    }
  })

  it('les pages masquées à Google restent interdites aux robots IA autorisés', () => {
    const rules = buildRobotsRules(['/faq'], {})
    expect(find(rules, 'ClaudeBot')).toMatchObject({ disallow: ['/faq'] })
  })
})
