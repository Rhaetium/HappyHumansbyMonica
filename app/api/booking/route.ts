import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, bookingConfirmationHtml, adminNotifHtml } from '@/lib/send-email';
import { getKvSettings } from '@/lib/cms-settings-server';
import { emailSubject } from '@/lib/email-subjects';
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact';
import { loadConnectionEnv } from '@/lib/connections';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — créneaux disponibles (public)
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });

  const { data, error } = await supabase
    .from('booking_slots')
    .select('id, slot_date, slot_time, slot_type, duration_minutes')
    .eq('status', 'available')
    .gte('slot_date', new Date().toISOString().split('T')[0])
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slots: data || [] });
}

// POST — soumettre une demande de réservation
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });

  const body = await req.json();
  const { slot_id, client_name, client_email, client_phone, message } = body;

  if (!slot_id || !client_name || !client_email) {
    return NextResponse.json({ error: 'slot_id, client_name et client_email sont requis' }, { status: 400 });
  }

  // Vérifier que le créneau est encore disponible
  const { data: slot } = await supabase
    .from('booking_slots')
    .select('id, status, slot_date, slot_time, slot_type')
    .eq('id', slot_id)
    .eq('status', 'available')
    .single();

  if (!slot) {
    return NextResponse.json({ error: 'Ce créneau n\'est plus disponible.' }, { status: 409 });
  }

  // Créer la demande
  const { data: booking, error } = await supabase
    .from('booking_requests')
    .insert({ slot_id, client_name, client_email, client_phone, message, status: 'pending' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Marquer le créneau comme temporairement réservé
  await supabase.from('booking_slots').update({ status: 'booked' }).eq('id', slot_id);

  // Emails asynchrones (ne bloque pas la réponse)
  const emailData = { name: client_name, email: client_email, phone: client_phone, date: slot?.slot_date, time: slot?.slot_time, slot_type: slot?.slot_type, message };
  const adminEmail = (await loadConnectionEnv()).ADMIN_EMAIL || DEFAULT_CONTACT_EMAIL;
  // Objets réglables dans ⚙️ Paramètres → 📧 Emails automatiques
  const kv = await getKvSettings();
  Promise.all([
    sendEmail({ to: client_email, subject: emailSubject('booking_confirmation', kv, { name: client_name }), html: bookingConfirmationHtml(emailData) }),
    sendEmail({ to: adminEmail,   subject: emailSubject('admin_notice', kv, { name: client_name }),       html: adminNotifHtml(emailData) }),
  ]).catch(() => {});

  return NextResponse.json({ booking, success: true }, { status: 201 });
}
