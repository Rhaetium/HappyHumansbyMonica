-- Verrouillage des règles d'accès (RLS) — 2026-11-09
--
-- Constat sur la base en production, avec la seule clé publique (celle que tout
-- visiteur reçoit) :
--   • contact_messages, booking_requests : lisibles par n'importe qui
--     (noms, e-mails, messages des clientes et clients) ;
--   • site_content (brouillons compris), site_settings, cms_settings_kv,
--     booking_slots, temoignages (non visibles compris) : lisibles par n'importe qui ;
--   • plusieurs tables accordent « FOR ALL TO authenticated USING (true) » :
--     or les inscriptions sont ouvertes, donc n'importe qui peut créer un compte
--     et réécrire le site, les créneaux et les réservations.
--
-- Or le site n'a besoin de presque rien côté public : le CMS s'authentifie par
-- mot de passe (lib/cms-auth.ts) et toutes ses routes, comme les formulaires
-- publics, passent par la clé service_role, qui ignore la RLS. La clé publique
-- ne sert qu'à deux lectures :
--   • components/DynamicTheme.tsx, DynamicFavicon.tsx → cms_settings_kv (theme_*, favicon_url)
--   • lib/blog-supabase.ts → cms_blog_posts publiés
--
-- Les politiques en production ne correspondent plus aux migrations du dépôt
-- (booking_requests y était lisible anonymement). Plutôt que de corriger table
-- par table à l'aveugle, on repart de zéro : on supprime TOUTES les politiques du
-- schéma public, on active la RLS partout, puis on recrée la courte liste de ce
-- qui doit rester public. Le résultat ne dépend pas de l'état de départ.
--
-- À exécuter en une fois dans Supabase → SQL Editor.

BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;

  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Thème et favicon, lus par le navigateur avec la clé publique.
CREATE POLICY "public_read_theme" ON public.cms_settings_kv
  FOR SELECT TO anon, authenticated
  USING (key LIKE 'theme\_%' OR key = 'favicon_url');

-- Articles publiés du blog (lib/blog-supabase.ts).
CREATE POLICY "public_read_published_posts" ON public.cms_blog_posts
  FOR SELECT TO anon, authenticated
  USING (published = true);

-- Questionnaires : reprises telles quelles de 20261102000000_questionnaires.sql,
-- qui avait été conçue correctement.
CREATE POLICY "questionnaires_public_read_active" ON public.questionnaires
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "submissions_public_insert_active" ON public.questionnaire_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questionnaires q
      WHERE q.id = questionnaire_id AND q.is_active = true
    )
  );

COMMIT;

-- Vérification (à lancer après) : il ne doit rester que les 4 politiques ci-dessus.
-- SELECT tablename, policyname, cmd, roles, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
