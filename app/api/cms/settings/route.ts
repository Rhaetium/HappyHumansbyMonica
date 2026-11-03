import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCmsAuth } from '@/lib/cms-auth'
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'
import { CALENDLY_BASE_DEFAULT, CALENDLY_EVENT_PLACEHOLDER } from '@/lib/calendly-config';
import { EMAIL_SUBJECT_DEFAULTS, EMAIL_SUBJECT_SETTING } from '@/lib/email-subjects';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const DEFAULT_SETTINGS = [
  // Thème
  { key: 'theme_preset',     label: 'Thème actif',                group_name: 'theme',    type: 'text',     value: 'forest' },
  { key: 'theme_primary',    label: 'Couleur principale',         group_name: 'theme',    type: 'text',     value: '' },
  { key: 'theme_accent',     label: 'Couleur accent',             group_name: 'theme',    type: 'text',     value: '' },
  { key: 'theme_dark',       label: 'Couleur sombre',             group_name: 'theme',    type: 'text',     value: '' },
  { key: 'theme_bg',         label: 'Couleur fond',               group_name: 'theme',    type: 'text',     value: '' },
  { key: 'theme_light',      label: 'Couleur claire (variante)',  group_name: 'theme',    type: 'text',     value: '' },
  { key: 'theme_text',       label: 'Couleur texte',              group_name: 'theme',    type: 'text',     value: '' },
  { key: 'theme_font_heading', label: 'Police des titres',        group_name: 'theme',    type: 'text',     value: '' },
  { key: 'theme_font_body',    label: 'Police du texte',          group_name: 'theme',    type: 'text',     value: '' },
  { key: 'illustration_pack', label: "Pack d'illustrations",   group_name: 'theme',    type: 'text',     value: 'cactus-nuit' },
  { key: 'photo_duotone',    label: 'Effet duotone sur les photos', group_name: 'theme',  type: 'select',   value: 'true', options: ['true', 'false'], optionLabels: ['Oui — photos teintées vert et or (charte)', 'Non — photos en couleurs naturelles'] },
  // Branding
  { key: 'logo_url',           label: 'Logo du site (image)',       group_name: 'branding', type: 'image',    value: '' },
  { key: 'logo_size',          label: 'Taille du logo (px)',        group_name: 'branding', type: 'text',     value: '52' },
  { key: 'logo_shape',         label: 'Forme du logo',              group_name: 'branding', type: 'text',     value: 'circle' },
  { key: 'logo_position',      label: 'Position dans le header',    group_name: 'branding', type: 'text',     value: 'left' },
  { key: 'logo_footer_url',    label: 'Logo du pied de page (version claire, pour fond vert foncé)', group_name: 'branding', type: 'image', value: '' },
  { key: 'logo_footer_size',   label: 'Taille logo footer (px)',  group_name: 'branding', type: 'text',     value: '36' },
  { key: 'logo_show_name',     label: 'Afficher le nom à côté du logo', group_name: 'branding', type: 'select', value: 'true', options: ['true', 'false'], optionLabels: ['Oui — logo + nom du site', 'Non — logo seul (le nom est déjà dans l’image)'] },
  { key: 'favicon_url',        label: 'Favicon (icône onglet)',    group_name: 'branding', type: 'image',    value: '' },
  { key: 'site_name',          label: 'Nom du site',               group_name: 'branding', type: 'text',     value: 'Happy Humans' },
  { key: 'tagline',            label: 'Tagline / Slogan',          group_name: 'branding', type: 'text',     value: 'philo-coaching' },
  // Logo text styling
  { key: 'logo_text_size',       label: 'Taille texte logo',           group_name: 'branding', type: 'text',     value: '2xl' },
  { key: 'logo_text_weight',     label: 'Graisse texte logo',         group_name: 'branding', type: 'text',     value: 'semibold' },
  { key: 'logo_text_color',      label: 'Couleur texte logo (hex)',    group_name: 'branding', type: 'text',     value: '#1c1917' },
  { key: 'logo_text_font',       label: 'Police texte logo',          group_name: 'branding', type: 'text',     value: 'serif' },
  { key: 'logo_text_tracking',   label: 'Espacement lettres logo',    group_name: 'branding', type: 'text',     value: 'tight' },
  { key: 'logo_text_line_height',label: 'Hauteur de ligne logo',      group_name: 'branding', type: 'text',     value: 'none' },
  { key: 'logo_text_spacing',    label: 'Letter-spacing logo (em)',   group_name: 'branding', type: 'text',     value: '0' },
  { key: 'contact_email',    label: 'Email de contact',            group_name: 'general',  type: 'text',     value: DEFAULT_CONTACT_EMAIL },
    // Réservation : un seul endroit pour changer le compte Calendly et les rendez-vous proposés
  { key: 'calendly_base_url', label: 'Compte Calendly (ex : https://calendly.com/mon-compte)', group_name: 'booking', type: 'text', value: CALENDLY_BASE_DEFAULT },
  { key: 'calendly_event_coaching', label: 'Rendez-vous — Coaching individuel (fin de l’adresse)', group_name: 'booking', type: 'text', value: '', placeholder: CALENDLY_EVENT_PLACEHOLDER },
  { key: 'calendly_event_happiness_design', label: 'Rendez-vous — Happiness Design', group_name: 'booking', type: 'text', value: '', placeholder: CALENDLY_EVENT_PLACEHOLDER },
  { key: 'calendly_event_sparring', label: 'Rendez-vous — Sparring Partner', group_name: 'booking', type: 'text', value: '', placeholder: CALENDLY_EVENT_PLACEHOLDER },
  { key: 'calendly_event_entreprises', label: 'Rendez-vous — Entreprises', group_name: 'booking', type: 'text', value: '', placeholder: CALENDLY_EVENT_PLACEHOLDER },
  { key: 'calendly_event_relations', label: 'Rendez-vous — Relations', group_name: 'booking', type: 'text', value: '', placeholder: CALENDLY_EVENT_PLACEHOLDER },
  { key: 'contact_phone',    label: 'Téléphone',                   group_name: 'general',  type: 'text',     value: '' },
  { key: 'address',          label: 'Adresse / Ville',             group_name: 'general',  type: 'text',     value: '' },
  { key: 'linkedin_url',     label: 'LinkedIn URL',                group_name: 'social',   type: 'text',     value: 'https://fr.linkedin.com/in/monica-schneider-philo-coaching' },
  { key: 'personal_site_url', label: 'Site personnel (profil schema.org)', group_name: 'social', type: 'text', value: 'https://monicaschneider.me/' },
  { key: 'instagram_url',    label: 'Instagram URL',               group_name: 'social',   type: 'text',     value: '' },
  { key: 'instagram_handle', label: 'Instagram @handle',           group_name: 'social',   type: 'text',     value: '' },
  { key: 'facebook_url',     label: 'Facebook URL',                group_name: 'social',   type: 'text',     value: '' },
  // Objets des e-mails automatiques (le corps des messages reste dans lib/send-email.ts)
  { key: EMAIL_SUBJECT_SETTING.booking_confirmation, label: 'Email — Objet « séance bien reçue » (visiteur)', group_name: 'emails', type: 'text', value: EMAIL_SUBJECT_DEFAULTS.booking_confirmation },
  { key: EMAIL_SUBJECT_SETTING.contact_confirmation, label: 'Email — Objet « message bien reçu » (visiteur)', group_name: 'emails', type: 'text', value: EMAIL_SUBJECT_DEFAULTS.contact_confirmation },
  { key: EMAIL_SUBJECT_SETTING.admin_notice, label: 'Email — Objet des notifications à Monica ({name} = nom du visiteur)', group_name: 'emails', type: 'text', value: EMAIL_SUBJECT_DEFAULTS.admin_notice },
  { key: 'seo_title',        label: 'Titre SEO par défaut',        group_name: 'seo',        type: 'text',     value: 'Happy Humans — Monica Schneider · Executive Coach' },
  { key: 'seo_description',  label: 'Description SEO par défaut', group_name: 'seo',        type: 'textarea', value: 'Monica Schneider — Executive Coach certifiée AoEC & EMCC. Coaching individuel, Happiness Design™, Sparring Partner. Paris & international.' },
  { key: 'og_image',         label: 'Image Open Graph (réseaux)', group_name: 'seo',        type: 'image',    value: '' },
  { key: 'seo_robots',       label: 'Robots global',              group_name: 'seo',        type: 'text',     value: 'index, follow' },
  { key: 'seo_canonical_domain', label: 'Domaine canonique',      group_name: 'seo',        type: 'text',     value: 'https://happyhumans.vercel.app' },
  // Geo / business
  { key: 'geo_business_name',    label: 'Nom entreprise (schema.org)',  group_name: 'geo', type: 'text',     value: 'Happy Humans — Monica Schneider' },
  { key: 'geo_address',          label: 'Adresse complète',             group_name: 'geo', type: 'text',     value: 'Paris, France' },
  { key: 'geo_lat',              label: 'Latitude (GPS)',               group_name: 'geo', type: 'text',     value: '48.8566' },
  { key: 'geo_lng',              label: 'Longitude (GPS)',              group_name: 'geo', type: 'text',     value: '2.3522' },
  { key: 'geo_default_locale',   label: 'Locale (ex: fr-FR)',          group_name: 'geo', type: 'text',     value: 'fr-FR' },
  { key: 'geo_default_region',   label: 'Région ISO (ex: FR)',         group_name: 'geo', type: 'text',     value: 'FR' },
  { key: 'geo_service_area',     label: 'Zone de service',             group_name: 'geo', type: 'text',     value: 'Paris, France, Europe, International' },
  { key: 'geo_price_range',      label: 'Gamme de prix (€ à €€€)',     group_name: 'geo', type: 'text',     value: '€€' },
  // Page visibility
  { key: 'page_home_indexable',              label: 'Accueil — indexé Google',          group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_coaching_indexable',          label: 'Coaching — indexé Google',         group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_entreprises_indexable',       label: 'Entreprises — indexé Google',    group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_happiness-design_indexable',  label: 'Happiness Design — indexé',        group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_sparring-partner_indexable',  label: 'Sparring Partner — indexé',        group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_relations_indexable',         label: 'Relations — indexé Google',        group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_temoignages_indexable',       label: 'Témoignages — indexé Google',      group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_a-propos_indexable',          label: 'À propos — indexé Google',         group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_booking_indexable',           label: 'Réservation — indexé Google',      group_name: 'visibility', type: 'text', value: 'false' },
  { key: 'page_contact_indexable',           label: 'Contact — indexé Google',          group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_blog_indexable',              label: 'Blog — indexé Google',             group_name: 'visibility', type: 'text', value: 'true' },
  { key: 'page_faq_indexable',               label: 'FAQ — indexée Google',             group_name: 'visibility', type: 'text', value: 'true' },
  // Footer
  { key: 'footer_text',      label: 'Texte copyright footer',      group_name: 'footer',   type: 'text',     value: '' },
  { key: 'footer_links',     label: 'Liens footer (JSON)',         group_name: 'footer',   type: 'textarea', value: '' },
];

export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ settings: DEFAULT_SETTINGS });

  const { data } = await supabase.from('cms_settings_kv').select('key, value');
  const dbMap: Record<string, string> = {};
  (data || []).forEach((r: { key: string; value: string }) => { dbMap[r.key] = r.value; });

  const merged = DEFAULT_SETTINGS.map(def => ({
    ...def,
    value: dbMap[def.key] !== undefined ? dbMap[def.key] : def.value,
  }));

  return NextResponse.json({ settings: merged });
}

export async function PUT(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });

  const body = await req.json();

  // Support both single {key, value} and batch {updates: [{key, value}]}
  const updates: { key: string; value: string }[] = body.updates
    ? body.updates
    : [{ key: body.key, value: body.value }];

  for (const { key, value } of updates) {
    if (!key) continue;
    const { error } = await supabase
      .from('cms_settings_kv')
      .upsert({ key, value: value ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
