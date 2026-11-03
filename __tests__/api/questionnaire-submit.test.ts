import { describe, it } from 'vitest'

describe('api/questionnaires/submit', () => {
  it('refuse les soumissions sans questionnaire', async () => {
    // Si le template_id est manquant, l’API publique doit répondre avec 400.
  })

  it('accepte les réponses complètes', async () => {
    // Une soumission valide doit renvoyer { success: true } et créer une entrée.
  })

  it('refuse les réponses incomplètes', async () => {
    // Si une question obligatoire n’est pas renseignée, la soumission doit être rejetée.
  })
})
