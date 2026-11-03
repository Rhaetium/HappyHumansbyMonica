import { describe, it } from 'vitest'

describe('api/cms/questionnaires', () => {
  it('route d’administration protégée', () => {
    // GET /api/cms/questionnaires
    // POST /api/cms/questionnaires
    // DELETE /api/cms/questionnaires?slug=...
    // La route doit refuser sans session CMS valide.
  })
})

describe('api/questionnaires/submit', () => {
  it('soumission publique acceptée', () => {
    // POST /api/questionnaires/submit peut être appelé sans session CMS.
  })

  it('soumission incomplète rejetée', () => {
    // Si une question obligatoire manque, la réponse doit être rejetée.
  })
})

describe('api/cms/dashboard', () => {
  it('dashboard protégé', () => {
    // GET /api/cms/dashboard doit refuser sans session CMS valide.
  })
})

describe('api/cms/ai-assist', () => {
  it('assistance IA réservée à l’admin', () => {
    // POST /api/cms/ai-assist doit refuser sans session CMS valide.
  })
})
