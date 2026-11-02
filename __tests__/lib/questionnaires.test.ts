import { describe, it, expect } from 'vitest'
import {
  slugify,
  validateQuestionnaire,
  validateAnswers,
  validateParticipant,
  parseSubmissionFilters,
  filterSubmissions,
  submissionsToCsv,
  type Question,
  type SubmissionRow,
} from '@/lib/questionnaires'

const questions: Question[] = [
  { id: 'energie', label: 'Énergie', type: 'scale', min: 1, max: 5, required: true },
  { id: 'humeur', label: 'Humeur', type: 'choice', options: ['Bien', 'Moyen'] },
  { id: 'note', label: 'Commentaire', type: 'text' },
]

const rows: SubmissionRow[] = [
  { id: '1', participant_name: 'Zoé Dupont', participant_email: 'zoe@example.fr', answers: { energie: 4 }, submitted_at: '2026-10-01T09:00:00Z' },
  { id: '2', participant_name: 'Marc Lefèvre', participant_email: 'marc@example.fr', answers: { energie: 2 }, submitted_at: '2026-10-15T18:30:00Z' },
  { id: '3', participant_name: null, participant_email: null, answers: {}, submitted_at: '2026-11-01T07:00:00Z' },
]

describe('slugify', () => {
  it('retire accents et ponctuation', () => {
    expect(slugify('Bilan d’énergie & équilibre !')).toBe('bilan-d-energie-equilibre')
  })
})

describe('validateQuestionnaire', () => {
  const base = { title: 'Bilan', questions: [{ id: 'q1', label: 'Comment ça va ?', type: 'text' }] }

  it('accepte un questionnaire minimal et déduit le slug du titre', () => {
    const res = validateQuestionnaire(base)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.slug).toBe('bilan')
  })

  it('refuse une liste de questions vide', () => {
    const res = validateQuestionnaire({ ...base, questions: [] })
    expect(res.ok).toBe(false)
  })

  it('refuse un type de question inconnu', () => {
    const res = validateQuestionnaire({ ...base, questions: [{ id: 'q1', label: 'Oui ?', type: 'file' }] })
    expect(!res.ok && res.errors.join(' ')).toMatch(/type inconnu/)
  })

  it('refuse les identifiants de question en double', () => {
    const res = validateQuestionnaire({ ...base, questions: [base.questions[0], base.questions[0]] })
    expect(!res.ok && res.errors.join(' ')).toMatch(/en double/)
  })

  it('refuse une échelle à bornes inversées ou trop large', () => {
    const inverted = validateQuestionnaire({ ...base, questions: [{ id: 'q1', label: 'Test', type: 'scale', min: 5, max: 1 }] })
    const wide = validateQuestionnaire({ ...base, questions: [{ id: 'q1', label: 'Test', type: 'scale', min: 0, max: 50 }] })
    expect(inverted.ok).toBe(false)
    expect(wide.ok).toBe(false)
  })

  it('exige au moins deux options pour un choix', () => {
    const res = validateQuestionnaire({ ...base, questions: [{ id: 'q1', label: 'Test', type: 'choice', options: ['Seule'] }] })
    expect(res.ok).toBe(false)
  })

  it('refuse un slug avec majuscules ou espaces', () => {
    const res = validateQuestionnaire({ ...base, slug: 'Mon Slug' })
    expect(res.ok).toBe(false)
  })
})

describe('validateAnswers', () => {
  it('garde les réponses valides et ignore les clés inconnues', () => {
    const res = validateAnswers(questions, { energie: 3, humeur: 'Bien', intrus: 'x' })
    expect(res).toEqual({ ok: true, value: { energie: 3, humeur: 'Bien' } })
  })

  it('accepte une échelle envoyée en texte numérique', () => {
    const res = validateAnswers(questions, { energie: '5' })
    expect(res).toEqual({ ok: true, value: { energie: 5 } })
  })

  it('refuse une valeur hors échelle', () => {
    expect(validateAnswers(questions, { energie: 9 }).ok).toBe(false)
  })

  it('refuse une option qui n’est pas proposée', () => {
    expect(validateAnswers(questions, { humeur: 'Autre' }).ok).toBe(false)
  })

  it('signale une question obligatoire sans réponse', () => {
    const res = validateAnswers(questions, {})
    expect(!res.ok && res.errors).toEqual(['« Énergie » est obligatoire.'])
  })

  it('ne lit pas un tableau ou une chaîne à la place de l’objet de réponses', () => {
    expect(validateAnswers(questions, ['energie', 3]).ok).toBe(false)
  })
})

describe('validateParticipant', () => {
  it('accepte des champs vides (facultatifs)', () => {
    expect(validateParticipant({})).toEqual({ ok: true, value: { name: null, email: null } })
  })

  it('refuse un e-mail mal formé', () => {
    expect(validateParticipant({ email: 'pas-un-mail' }).ok).toBe(false)
  })
})

describe('filtres du tableau de bord', () => {
  it('filtre par participant sans tenir compte de la casse ni des accents', () => {
    const f = parseSubmissionFilters(new URLSearchParams('participant=LEFEVRE'))
    expect(filterSubmissions(rows, f).map(r => r.id)).toEqual(['2'])
  })

  it('cherche aussi dans l’e-mail', () => {
    const f = parseSubmissionFilters(new URLSearchParams('participant=zoe@'))
    expect(filterSubmissions(rows, f).map(r => r.id)).toEqual(['1'])
  })

  it('filtre par période, bornes incluses', () => {
    const f = parseSubmissionFilters(new URLSearchParams('from=2026-10-01&to=2026-10-15'))
    expect(filterSubmissions(rows, f).map(r => r.id)).toEqual(['1', '2'])
  })

  it('inverse les dates si elles sont données à l’envers', () => {
    const f = parseSubmissionFilters(new URLSearchParams('from=2026-10-15&to=2026-10-01'))
    expect(f.from).toBe('2026-10-01')
    expect(f.to).toBe('2026-10-15')
  })

  it('ignore une date mal formée', () => {
    const f = parseSubmissionFilters(new URLSearchParams('from=01/10/2026'))
    expect(f.from).toBeNull()
  })
})

describe('export CSV', () => {
  it('produit un CSV Excel : BOM, séparateur « ; », libellés en colonnes', () => {
    const csv = submissionsToCsv(questions, rows.slice(0, 1))
    expect(csv.startsWith('﻿')).toBe(true)
    const [header, line] = csv.replace('﻿', '').trim().split('\r\n')
    expect(header).toBe('Date (UTC);Nom;E-mail;Énergie;Humeur;Commentaire')
    expect(line).toBe('2026-10-01T09:00:00Z;Zoé Dupont;zoe@example.fr;4;;')
  })

  it('neutralise les formules injectées dans une cellule', () => {
    const evil: SubmissionRow[] = [{ ...rows[0], participant_name: '=HYPERLINK("http://x")', answers: {} }]
    const csv = submissionsToCsv(questions, evil)
    expect(csv).toContain(`'=HYPERLINK`)
  })

  it('entoure de guillemets les cellules contenant un point-virgule', () => {
    const tricky: SubmissionRow[] = [{ ...rows[0], answers: { note: 'oui; peut-être' } }]
    const qs = [...questions, { id: 'note2', label: 'Note', type: 'text' as const }]
    const csv = submissionsToCsv(qs, [{ ...tricky[0], answers: { note2: 'a;b "c"' } }])
    expect(csv).toContain('"a;b ""c"""')
  })
})
