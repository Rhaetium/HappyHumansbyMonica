import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact';
import { createClient } from '@supabase/supabase-js'
import { sendEmail, contactConfirmationHtml, adminNotifHtml } from '@/lib/send-email'
import { loadConnectionEnv } from '@/lib/connections'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, message, type = 'contact' } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'name, email et message sont requis' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      // Supabase pas encore configuré — on répond OK quand même pour ne pas bloquer
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('contact_messages')
      .insert({ name, email, message, type, status: 'unread' })

    if (error) {
      console.error('contact insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const adminEmail = (await loadConnectionEnv()).ADMIN_EMAIL || DEFAULT_CONTACT_EMAIL
    Promise.all([
      sendEmail({ to: email,       subject: 'Message bien reçu — Happy Humans',    html: contactConfirmationHtml(name) }),
      sendEmail({ to: adminEmail,  subject: `Nouveau message — ${name}`,            html: adminNotifHtml({ name, email, message }) }),
    ]).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('contact error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
