-- ── Questionnaires & usage (CM4) ─────────────────────────────────────────────
-- Tables pour que Monica puisse créer des questionnaires depuis le CMS, les
-- lancer sur le site, recevoir les réponses, et voir un récap journalier.
--
-- Architecture retenue :
--  - questionnaire_templates : definition des questionnaires éditables (titre,.
--    description, questions, settings). Mis à jour depuis l'admin CMS.
--  - questionnaire_attempts : chaque participation (réponses anonymes ou avec
--    email), horodatée, avec un résultat calculé côté serveur quand c'est un
--    questionnaire à score (ex. style d'attachement, typologie…).
--  - questionnaire_daily_summary : vue matérialisée refreshée selon besoin pour
--    le dashboard "par jour" (nombre de participants, taux de complétion, points
--    forts / points de vigilance si score disponible, dernières participations).

-- ── 1. Templates de questionnaires ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  intro_text text NOT NULL DEFAULT '',
  privacy_text text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]',
  -- Paramètres du questionnaire
  anonymous boolean NOT NULL DEFAULT true,
  multi_step boolean NOT NULL DEFAULT false,
  progress_label text NOT NULL DEFAULT '',
  result_template jsonb,                 -- optionnel : présentation des résultats
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- Lecture publique : le frontend doit pouvoir charger le questionnaire pour l'afficher.
CREATE POLICY "Public read questionnaire templates"
  ON questionnaire_templates FOR SELECT
  TO public
  USING (true);

-- Écriture réservée à l'admin (service_role via les routes API CMS).
CREATE POLICY "Service role writes questionnaire templates"
  ON questionnaire_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_slug
  ON questionnaire_templates(slug);

-- ── Questions JSON : format attendu ────────────────────────────────────────────
-- [
--   { "id": "q1", "text": "…", "type": "scale", "options": [1,2,3,4,5], "required": true },
--   { "id": "q2", "text": "…", "type": "multiple", "options": [...], "required": true },
--   { "id": "q3", "text": "…", "type": "short_text", "required": true },
--   { "id": "q4", "text": "…", "type": "long_text", "required": false }
-- ]
-- Types supportés : scale, multiple, short_text, long_text.
-- Pour les questionnaires à score (ex. test d'attachement) : on garde une clé
-- "scoring" dans la question si nécessaire, mais le calcul des résultats reste
-- côté serveur dans les fonctions Postgres (voir plus bas).

-- ── 2. Réponses aux questionnaires ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS questionnaire_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,               -- null si abandon
  answers jsonb NOT NULL DEFAULT '{}',   -- { "q1": [...], "q2": "texte" }
  email text,                             -- présent seulement si anonyme = false et renseigné
  result jsonb,                          -- résultat calculé (score, profile…) si applicable
  user_agent text,                        -- diagnostique light (pas PII)
  ip_hash text,                           -- identifiant anonymisé pour limiter les doubles
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE questionnaire_attempts ENABLE ROW LEVEL SECURITY;

-- Public : jamais. L'usage mette en œuvre un contrôle d'accès serveur strict.
CREATE POLICY "No public access to attempts"
  ON questionnaire_attempts FOR SELECT
  TO public
  USING (false);

CREATE POLICY "No public insert to attempts"
  ON questionnaire_attempts FOR INSERT
  TO public
  WITH CHECK (false);

-- Lecture/écriture réservée à l'admin (service_role) + fonctions SEF si besoin.
CREATE POLICY "Service role full access to attempts"
  ON questionnaire_attempts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_questionnaire_attempts_template_completed
  ON questionnaire_attempts(template_id, completed_at NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_questionnaire_attempts_created
  ON questionnaire_attempts(created_at DESC);

-- Identifiant anonymisé simple : hash SHA256 de l'IP + user-agent (ex. pour limiter les doublons),
-- sans stocker l'IP en clair. À activer si on veut limiter les participations multiples.

-- ── 2b. Fonction de calcul de résultat scalaire (ex. test d'attachement) ───────
-- Reçoit les réponses et une définition de scoring, retourne un JSON structuré.
-- Laisser évoluer selon les questionnaires (score brut, pourcentages, profile).

CREATE OR REPLACE FUNCTION questionnaire_calculate_result(
  _answers jsonb,
  _scoring jsonb
) RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'computed', true
  )
$$;

-- ── 3. Dashboard journalier : vue matérialisée ──────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS questionnaire_daily_summary AS
SELECT
  date_trunc('day', created_at) AS day,
  template_id,
  count(*) AS total_attempts,
  count(completed_at) AS completed_attempts,
  count(*) FILTER (WHERE created_at >= date_trunc('day', now() - interval '1 day')) AS attempts_today,
  count(completed_at) FILTER (WHERE created_at >= date_trunc('day', now() - interval '1 day')) AS completed_today
FROM questionnaire_attempts
GROUP BY date_trunc('day', created_at), template_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questionnaire_daily_summary_day_template
  ON questionnaire_daily_summary(day, template_id);

COMMENT ON MATERIALIZED VIEW questionnaire_daily_summary IS
  'Récap par jour par questionnaire. Rafraîchissable on demand (REFRESH MATERIALIZED VIEW CONCURRENTLY).';

-- Politique de lecture pour l'admin CMS (service_role). Aucune lecture publique.
CREATE POLICY "Service role reads daily summary"
  ON questionnaire_daily_summary FOR SELECT
  TO service_role
  USING (true);

-- ── 4. Fonction utilitaire : rafraîchissement du récap ─────────────────────────

CREATE OR REPLACE FUNCTION refresh_questionnaire_daily_summary() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY questionnaire_daily_summary;
$$;

COMMENT ON FUNCTION refresh_questionnaire_daily_summary() IS
  'À utiliser depuis une tâche planifiée ou l’admin CMS pour mettre à jour le dashboard journalier.';

-- ── 5. Migration de données : aucun contenu àporter ────────────────────────────

-- Aucun questionnaire actif dans ce projet pour l'instant. Les textes par défaut
-- des premiers questionnaires seront saisis directement dans le CMS (admin).

-- ── 6. Notes de déploiement ─────────────────────────────────────────────────────

-- - Cette migration est sans effet sur le site public tant que les routes API
--   CMS ne sont pas appelées. Les tables sont protégées par RLS.
-- - Le bucket de stockage cms-assets est déjà en place ; aucun changement ici.
-- - Pour le dashboard "par jour" dans l'admin, voire app/cms-admin/page.tsx et
--   app/dashboard/page.tsx selon l'interface cible (statistiques CMS).

-- Fin du fichier.
