import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact';
import {
  CALENDLY_BASE_DEFAULT,
  CALENDLY_BASE_SETTING,
  CALENDLY_EVENT_SETTING,
} from '@/lib/calendly-config';

// Endpoint public pour les paramètres globaux du site (logo, taille, nom)
// Utilisé par Header pour ne pas dépendre de NEXT_PUBLIC_SUPABASE_ANON_KEY
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ settings: {} });

  const sb = createClient(url, key);
  const { data } = await sb
    .from('cms_settings_kv')
    .select('key, value')
    .in('key', [
      'logo_url', 'logo_size', 'logo_shape', 'logo_position', 'logo_footer_size', 'logo_footer_url', 'logo_show_name', 'photo_duotone', 'site_name', 'tagline',
      'theme_preset', 'theme_primary', 'theme_accent', 'theme_dark', 'theme_light', 'theme_bg', 'theme_text', 'favicon_url',
      'theme_font_heading', 'theme_font_body',
      'illustration_pack',
      // coordonnées et réservation : un seul endroit à changer pour tout le site
      'contact_email',
      CALENDLY_BASE_SETTING,
      ...Object.values(CALENDLY_EVENT_SETTING),
      'logo_text_size', 'logo_text_weight', 'logo_text_color', 'logo_text_font',
      'logo_text_tracking', 'logo_text_line_height', 'logo_text_spacing',
    ]);

  const settings: Record<string, string> = {};
  (data || []).forEach((r: { key: string; value: string }) => { if (r.value) settings[r.key] = r.value; });

  // Replis : un réglage jamais enregistré (ou vidé) ne doit pas laisser un bouton sans adresse.
  // Les rendez-vous par service, eux, n'ont pas de repli : un slug deviné donnerait une adresse
  // invalide (« This Calendly URL is not valid »). Sans slug, le service retombe sur l'agenda du compte.
  settings.contact_email ||= DEFAULT_CONTACT_EMAIL;
  settings[CALENDLY_BASE_SETTING] ||= CALENDLY_BASE_DEFAULT;

  return NextResponse.json(
    { settings },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' } }
  );
}
