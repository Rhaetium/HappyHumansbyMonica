import { describe, it, expect } from 'vitest'
import { buildGenerationPrompt, extractJsonObject, parseGeneratedQuestionnaire } from '@/lib/questionnaire-ai'

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

  it('rejette une question mal formée produite par le modèle', () => {
    const broken = { ...sample, questions: [{ id: 'q1', label: 'Test', type: 'scale', min: 9, max: 2 }] }
    const res = parseGeneratedQuestionnaire(JSON.stringify(broken), 'general')
    expect(res.ok).toBe(false)
  })

  it('rejette une réponse qui n’est pas du JSON', () => {
    const res = parseGeneratedQuestionnaire('pas du json du tout', 'general')
    expect(!res.ok && res.errors[0]).toMatch(/illisible/)
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
