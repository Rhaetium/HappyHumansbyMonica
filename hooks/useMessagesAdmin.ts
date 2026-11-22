'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ContactMessage } from '@/components/cms/admin/types'
import type { MessageFilter } from '@/lib/cms-messages'

type Options = {
  /** Charger les messages dès que ce drapeau passe à vrai (admin connecté + onglet Messages ou Tableau de bord ouvert). */
  active: boolean
  showToast: (message: string) => void
  /** Appelé quand le serveur répond 401 (session expirée). */
  onUnauthorized: () => void
}

/**
 * Logique de l'onglet « Messages » (et du compteur du tableau de bord) : liste, filtre, chargement.
 * Extraite de app/cms-admin/page.tsx sans changement de comportement.
 */
export function useMessagesAdmin({ active, showToast, onUnauthorized }: Options) {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all')
  const [loadingMessages, setLoadingMessages] = useState(false)

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true)
    try {
      const res = await fetch('/api/cms/contact-messages')
      if (res.status === 401) { onUnauthorized(); return }
      const d = await res.json()
      setMessages(d.messages || [])
    } catch { showToast('Impossible de charger les messages.') }
    finally { setLoadingMessages(false) }
  }, [onUnauthorized, showToast])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement depuis l'API
  useEffect(() => { if (active) loadMessages() }, [active, loadMessages])

  return { messages, setMessages, messageFilter, setMessageFilter, loadingMessages, loadMessages }
}
