import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/site-url'

// Liens et nom du site des e-mails : toujours l'adresse officielle (lib/site-url.ts), jamais écrite en dur.
const SITE_HOST = new URL(SITE_URL).hostname

// Newsletter Happy Humans — Brevo (contacts) + Resend (email de bienvenue)
// Variables requises : BREVO_API_KEY (obligatoire), RESEND_API_KEY (optionnel)
// Liste Brevo cible : listIds [2] — "Newsletter Happy Humans"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Adresse email invalide' },
        { status: 400 }
      )
    }

    // 1. Ajout dans Brevo
    const brevoApiKey = process.env.BREVO_API_KEY
    if (brevoApiKey) {
      const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          email,
          listIds: [2],
          updateEnabled: true,
        }),
      })

      if (!brevoRes.ok) {
        const err = await brevoRes.json()
        // Contact déjà inscrit → pas une erreur bloquante
        if (err.code !== 'duplicate_parameter') {
          console.error('Brevo error:', err)
          return NextResponse.json({ error: 'Erreur inscription newsletter' }, { status: 400 })
        }
      }
    } else {
      console.warn('BREVO_API_KEY non configurée — inscription simulée')
    }

    // 2. Email de bienvenue via Resend (optionnel)
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)
      await resend.emails.send({
        from: 'Happy Humans <onboarding@resend.dev>',
        to: [email],
        subject: "\uD83C\uDF3F Bienvenue dans l'aventure Happy Humans !",
        html: `
          <div style="font-family:Georgia,serif;max-width:580px;margin:0 auto;color:#1c1917">
            <div style="background:#78350f;padding:32px 40px;text-align:center">
              <h1 style="color:#fef3c7;font-weight:300;font-size:28px;margin:0;letter-spacing:0.05em">Happy Humans</h1>
              <p style="color:#fde68a;font-size:12px;letter-spacing:0.2em;margin:8px 0 0">SLOW TRAVEL · L'EXPERT DE L'AVENTURE</p>
            </div>
            <div style="padding:40px;background:#fffbf5">
              <p style="font-size:18px;margin:0 0 16px">Bienvenue dans l'aventure \u2728</p>
              <p style="color:#57534e;line-height:1.7;margin:0 0 20px">
                On est ravis de t'avoir parmi nous. Tu vas recevoir nos meilleures p\u00e9pites d\u00e9nich\u00e9es : carnets de voyage en couple, adresses hors sentiers battus, et exp\u00e9riences slow que seul un vrai terrain peut r\u00e9v\u00e9ler.
              </p>
              <p style="color:#57534e;line-height:1.7;margin:0 0 32px">
                En attendant notre prochain carnet, explore les destinations qu'on a v\u00e9cues :
              </p>
              <a href="${SITE_URL}/blog" style="display:inline-block;background:#78350f;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-size:14px;font-family:sans-serif">Voir le blog \u2192</a>
            </div>
            <div style="padding:24px 40px;background:#f5f0eb;text-align:center">
              <p style="font-size:12px;color:#a8a29e;margin:0">
                Tu re\u00e7ois cet email car tu t'es inscrit(e) sur ${SITE_HOST} · Conformément au RGPD, tes données ne sont utilisées que pour l'envoi de cette newsletter.<br/>
                <a href="${SITE_URL}/mentions-legales" style="color:#78350f">Se désabonner</a> · <a href="${SITE_URL}" style="color:#78350f">${SITE_HOST}</a>
              </p>
            </div>
          </div>
        `,
      })
    }

    return NextResponse.json(
      { success: true, message: 'Inscription confirm\u00e9e !' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Newsletter error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
