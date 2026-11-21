import { NextRequest, NextResponse } from 'next/server'
import { loadConnectionEnv } from '@/lib/connections'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email manquant' },
        { status: 400 }
      )
    }

    // Intégration Brevo
    const brevoApiKey = (await loadConnectionEnv()).BREVO_API_KEY
    
    if (!brevoApiKey) {
      console.warn('BREVO_API_KEY non configurée')
      // Pour l'instant, on accepte quand même
      return NextResponse.json(
        { success: true, message: 'Email reçu (Brevo non configuré)' },
        { status: 200 }
      )
    }

    // Appel API Brevo pour ajouter le contact
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        email: email,
        listIds: [2], // ID de la liste Brevo (à adapter)
        updateEnabled: true,
      }),
    })

    if (!brevoResponse.ok) {
      const error = await brevoResponse.json()
      console.error('Erreur Brevo:', error)
      
      // Si le contact existe déjà, c'est ok
      if (error.code === 'duplicate_parameter') {
        return NextResponse.json(
          { success: true, message: 'Email déjà inscrit' },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { error: 'Erreur Brevo' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Inscription réussie' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur API subscribe:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
