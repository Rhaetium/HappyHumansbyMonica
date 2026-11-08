import { describe, it, expect } from 'vitest'
import { buildGenerationPrompt, extractJsonObject, normalizeGeneratedQuestionnaire, parseGeneratedQuestionnaire } from '@/lib/questionnaire-ai'

const sample = {
  title: 'Énergie au travail',
  description: 'Quelques questions pour faire le point.',
  questions: [
    { id: 'q1', label: 'Comment vous sentez-vous ?', type: 'scale', required: true, min: 1, max: 5, minLabel: 'épuisé', maxLabel: 'plein d’élan' },
    { id: 'q2', label: 'Quand êtes-vous le plus productif ?', type: 'choice', options: ['Matin', 'Après-midi'] },
    { id: 'q3', label: 'Qu’aimeriez-vous changer ?', type: 'text' },
  ],
}

describe('extractJsonObject', () => {
  it('lit un JSON nu', () => {
    expect(extractJsonObject(JSON.stringify(sample))).toEqual(sample)
  })

  it('lit un JSON entouré de texte ou de balises ```json', () => {
    const text = `Voici le questionnaire :\n\`\`\`json\n${JSON.stringify(sample)}\n\`\`\`\nBonne relecture !`
    expect(extractJsonObject(text)).toEqual(sample)
  })

  it('échoue proprement s’il n’y a pas de JSON', () => {
    expect(() => extractJsonObject('désolé, je ne peux pas')).toThrow()
  })
})

describe('parseGeneratedQuestionnaire', () => {
  it('valide la sortie du modèle avec les mêmes règles que le formulaire manuel', () => {
    const res = parseGeneratedQuestionnaire(JSON.stringify(sample), 'coaching')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.slug).toBe('energie-au-travail')
      expect(res.value.category).toBe('coaching')
      expect(res.value.is_active).toBe(false) // un brouillon IA n'est jamais actif
      expect(res.value.questions).toHaveLength(3)
    }
  })

  it('répare une échelle incohérente produite par le modèle (→ 1 à 5)', () => {
    const broken = { ...sample, questions: [{ id: 'q1', label: 'Test', type: 'scale', min: 9, max: 2 }] }
    const res = parseGeneratedQuestionnaire(JSON.stringify(broken), 'general')
    expect(res.ok && res.value.questions[0]).toMatchObject({ min: 1, max: 5 })
  })

  it('rejette une question irréparable (choix avec une seule option)', () => {
    const broken = { ...sample, questions: [{ id: 'q1', label: 'Test', type: 'choice', options: ['Seule'] }] }
    const res = parseGeneratedQuestionnaire(JSON.stringify(broken), 'general')
    expect(res.ok).toBe(false)
  })

  it('accepte la sortie réelle de Llama 3.3 (Cloudflare), échelle 20-60 et guillemet parasite compris', () => {
    // Réponse obtenue le 08/11/2026 : échelle de 40 points, min/max/options sur des questions texte, '"' final.
    const llama = '{"title":"Équilibre vie professionnelle et vie personnelle","description":"Ce questionnaire vous aidera.","questions":[{"id":"q1","label":"À quel point votre vie professionnelle est-elle satisfaisante ?","type":"scale","required":true,"min":1,"max":5,"options":[]},{"id":"q2","label":"Quels domaines aimeriez-vous améliorer ?","type":"choice","required":true,"min":0,"max":0,"options":["Amis et famille","Loisirs","Autre"]},{"id":"q3","label":"Décrivez votre journée type.","type":"text","required":true,"min":0,"max":0,"options":[]},{"id":"q4","label":"Combien d\'heures travaillez-vous par semaine ?","type":"scale","required":true,"min":20,"max":60,"options":[]}]}"'
    const res = parseGeneratedQuestionnaire(llama, 'coaching')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.questions.map(q => q.type)).toEqual(['scale', 'choice', 'text', 'scale'])
      expect(res.value.questions[3]).toMatchObject({ min: 1, max: 5 })
      expect(res.value.questions[2]).not.toHaveProperty('options')
    }
  })

  it('rejette une réponse qui n’est pas du JSON', () => {
    const res = parseGeneratedQuestionnaire('pas du json du tout', 'general')
    expect(!res.ok && res.errors[0]).toMatch(/illisible/)
  })
})

describe('normalizeGeneratedQuestionnaire', () => {
  it('renumérote les identifiants, dédoublonne les options et garde une échelle valide', () => {
    const out = normalizeGeneratedQuestionnaire({
      title: '  Titre  ',
      questions: [
        { id: 'x', label: ' A ', type: 'SCALE', min: 0, max: 10 },
        { id: 'x', label: 'B', type: 'choice', options: ['Oui', 'Oui', ' ', 'Non'] },
      ],
    })
    expect(out.title).toBe('Titre')
    expect(out.questions).toEqual([
      { id: 'q1', label: 'A', type: 'scale', required: false, min: 0, max: 10 },
      { id: 'q2', label: 'B', type: 'choice', required: false, options: ['Oui', 'Non'] },
    ])
  })

  it('ne plante pas sur une entrée absurde', () => {
    expect(normalizeGeneratedQuestionnaire(null)).toEqual({ title: '', description: '', questions: [] })
    expect(normalizeGeneratedQuestionnaire({ questions: [null, 'texte', 3] }).questions).toEqual([])
  })
})

describe('buildGenerationPrompt', () => {
  it('reprend le sujet, le public et le nombre de questions', () => {
    const p = buildGenerationPrompt({ topic: 'Burn-out', audience: 'managers', questionCount: 5 })
    expect(p).toContain('Sujet du questionnaire : Burn-out')
    expect(p).toContain('Public visé : managers')
    expect(p).toContain('Nombre de questions : 5')
  })
})
