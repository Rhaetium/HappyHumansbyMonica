import { describe, it, expect } from 'vitest'
import { buildAssistantPrompt, parseAssistantResponse, selectRelevantFields, MAX_CHANGES } from '@/lib/assistant'
import { buildContentIndex } from '@/lib/cms-search'

const DEFS = [
  { page: 'home', pageLabel: 'Accueil', emoji: '🏠', key: 'hero_title', label: 'Bandeau — Titre', type: 'text' },
  { page: 'home', pageLabel: 'Accueil', emoji: '🏠', key: 'hero_cta_href', label: 'Bandeau — Lien du bouton', type: 'text' },
  { page: 'coaching', pageLabel: 'Coaching', emoji: '🌱', key: 'intro', label: 'Introduction', type: 'textarea' },
  { page: 'coaching', pageLabel: 'Coaching', emoji: '🌱', key: 'sections', label: 'Ordre des sections', type: 'list' },
  { page: 'coaching', pageLabel: 'Coaching', emoji: '🌱', key: 'photo', label: 'Photo', type: 'image' },
]
const DEFAULTS = {
  home: { hero_title: "Accompagner l'épanouissement", hero_cta_href: '/contact' },
  coaching: { intro: 'Un accompagnement sur mesure pour avancer.', sections: '[]', photo: '/p.jpg' },
}
const index = buildContentIndex(DEFS, [], DEFAULTS)

describe('selectRelevantFields', () => {
  it('privilégie la page nommée dans la demande et ignore listes et images', () => {
    const r = selectRelevantFields(index, 'Rends la page coaching plus chaleureuse')
    expect(r.map(f => f.key)).toEqual(['intro'])
  })
  it('sans mot reconnu, retombe sur la page d’accueil', () => {
    expect(selectRelevantFields(index, 'xyz').every(f => f.page === 'home')).toBe(true)
  })
  it('limite le nombre de champs', () => {
    expect(selectRelevantFields(index, 'accueil coaching', 1)).toHaveLength(1)
  })
})

describe('buildAssistantPrompt', () => {
  it('contient la demande et les champs avec leur identifiant', () => {
    const p = buildAssistantPrompt('Plus chaleureux', selectRelevantFields(index, 'coaching'))
    expect(p).toContain('Plus chaleureux')
    expect(p).toContain('[coaching|intro]')
    expect(p).toContain('Un accompagnement sur mesure')
  })
})

describe('parseAssistantResponse', () => {
  const fields = selectRelevantFields(index, 'accueil coaching')
  const ok = JSON.stringify({ reply: 'Voilà', changes: [{ page: 'coaching', key: 'intro', value: 'Un accompagnement chaleureux, à votre rythme.', reason: 'plus doux' }] })

  it('garde un changement valide avec l’avant et l’après', () => {
    const r = parseAssistantResponse(ok, fields)
    expect(r.reply).toBe('Voilà')
    expect(r.changes).toHaveLength(1)
    expect(r.changes[0]).toMatchObject({ page: 'coaching', key: 'intro', before: 'Un accompagnement sur mesure pour avancer.', after: 'Un accompagnement chaleureux, à votre rythme.' })
  })
  it('accepte une réponse entourée de texte ou d’un bloc de code', () => {
    expect(parseAssistantResponse('Voici :\n```json\n' + ok + '\n```', fields).changes).toHaveLength(1)
  })
  it('ignore un champ inconnu, un texte inchangé ou vide', () => {
    const raw = JSON.stringify({ changes: [
      { page: 'coaching', key: 'inconnu', value: 'x' },
      { page: 'coaching', key: 'sections', value: 'x' }, // champ non proposé à l’IA
      { page: 'coaching', key: 'intro', value: 'Un accompagnement sur mesure pour avancer.' },
      { page: 'home', key: 'hero_title', value: '   ' },
    ] })
    expect(parseAssistantResponse(raw, fields).changes).toEqual([])
  })
  it('ne touche jamais aux liens : non proposés à l’IA, donc ignorés dans sa réponse', () => {
    expect(fields.some(f => f.key === 'hero_cta_href')).toBe(false)
    const raw = JSON.stringify({ changes: [{ page: 'home', key: 'hero_cta_href', value: 'https://autre.site' }] })
    expect(parseAssistantResponse(raw, fields).changes).toEqual([])
  })
  it('signale un passage [entre crochets] laissé tel quel, sans bloquer', () => {
    const raw = JSON.stringify({ changes: [{ page: 'coaching', key: 'intro', value: 'Bonjour [Prénom], bienvenue.' }] })
    expect(parseAssistantResponse(raw, fields).changes[0].warning).toContain('crochets')
  })
  it('un doublon n’est gardé qu’une fois, et le nombre est plafonné', () => {
    const one = { page: 'coaching', key: 'intro', value: 'Autre texte' }
    expect(parseAssistantResponse(JSON.stringify({ changes: [one, one] }), fields).changes).toHaveLength(1)
    expect(MAX_CHANGES).toBeGreaterThan(0)
  })
  it('réponse illisible : rien, sans erreur', () => {
    expect(parseAssistantResponse('désolé', fields)).toEqual({ reply: '', changes: [] })
  })
})
