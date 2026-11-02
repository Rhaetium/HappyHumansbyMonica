-- Questionnaires dynamiques (générateur IA, affichage public par QR code, tableau de bord CMS).
--
-- Sécurité (RLS) :
--  • le public (rôle anon) peut LIRE uniquement les questionnaires actifs ;
--  • le public peut ENVOYER une réponse uniquement à un questionnaire actif ;
--  • personne côté public ne peut lire les réponses, ni modifier un questionnaire ;
--  • les routes /api/cms/* utilisent la clé service_role (qui contourne la RLS) après
--    authentification CMS. Aucune politique « USING (true) » n'est ajoutée.

CREATE TABLE IF NOT EXISTS questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 80),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT,
    category TEXT DEFAULT 'general',           -- ex: 'coaching', 'audhd', 'bilan'
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format d'une question : [{"id": "q1", "label": "...", "type": "scale|text|choice", "options": []}]
    -- (validé côté serveur par lib/questionnaires.ts : la base ne vérifie que la forme générale)
    CONSTRAINT questionnaires_questions_is_array CHECK (jsonb_typeof(questions) = 'array'),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questionnaire_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    participant_name TEXT CHECK (participant_name IS NULL OR char_length(participant_name) <= 200),
    participant_email TEXT CHECK (participant_email IS NULL OR char_length(participant_email) <= 320),
    answers JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"q1": "valeur", "q2": 4}
    CONSTRAINT submissions_answers_is_object CHECK (jsonb_typeof(answers) = 'object'),
    submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_date ON questionnaire_submissions (submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_qid ON questionnaire_submissions (questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_submissions_qid_date ON questionnaire_submissions (questionnaire_id, submitted_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questionnaires_public_read_active" ON questionnaires;
CREATE POLICY "questionnaires_public_read_active" ON questionnaires
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "submissions_public_insert_active" ON questionnaire_submissions;
CREATE POLICY "submissions_public_insert_active" ON questionnaire_submissions
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM questionnaires q
            WHERE q.id = questionnaire_id AND q.is_active = true
        )
    );

-- Aucune politique SELECT/UPDATE/DELETE pour anon : les réponses ne sont lisibles que via service_role.
REVOKE ALL ON questionnaire_submissions FROM anon, authenticated;
GRANT INSERT ON questionnaire_submissions TO anon, authenticated;
REVOKE ALL ON questionnaires FROM anon, authenticated;
GRANT SELECT ON questionnaires TO anon, authenticated;
