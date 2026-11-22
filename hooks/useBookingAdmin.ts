'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BookingRequest, BookingSlot } from '@/components/cms/admin/types'

type Options = {
  /** Charger les créneaux et les demandes dès que ce drapeau passe à vrai (admin connecté + onglet Réservations ouvert). */
  active: boolean
  showToast: (message: string) => void
  /** Renvoie vrai (et gère la déconnexion) si la réponse est un 401. */
  handleUnauthorized: (res: Response) => boolean
}

const EMPTY_SLOT = { date: '', time: '10:00', type: 'coaching', notes: '' }

/**
 * Logique de l'onglet « Réservations » de l'admin : créneaux (liste, ajout, suppression) et demandes (liste, changement de statut).
 * Extraite de app/cms-admin/page.tsx sans changement de comportement.
 */
export function useBookingAdmin({ active, showToast, handleUnauthorized }: Options) {
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([])
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [savingSlot, setSavingSlot] = useState(false)
  const [newSlot, setNewSlot] = useState(EMPTY_SLOT)

  const loadBookingSlots = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const res = await fetch('/api/cms/booking-slots')
      if (handleUnauthorized(res)) return
      const data = await res.json()
      setBookingSlots(data.slots || [])
    } catch {
      showToast('Impossible de charger les créneaux.')
    } finally {
      setLoadingSlots(false)
    }
  }, [handleUnauthorized, showToast])

  const loadBookingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/booking-requests')
      if (handleUnauthorized(res)) return
      const data = await res.json()
      setBookingRequests(data.requests || [])
    } catch {
      showToast('Impossible de charger les demandes.')
    }
  }, [handleUnauthorized, showToast])

  const saveNewSlot = async () => {
    if (!newSlot.date || !newSlot.time) {
      showToast("Veuillez remplir la date et l'heure")
      return
    }
    setSavingSlot(true)
    try {
      const res = await fetch('/api/cms/booking-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot),
      })
      if (handleUnauthorized(res)) return
      showToast('Créneau ajouté')
      setNewSlot(EMPTY_SLOT)
      loadBookingSlots()
    } catch {
      showToast("Erreur: Impossible d'ajouter")
    } finally {
      setSavingSlot(false)
    }
  }

  const deleteSlot = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return
    try {
      const res = await fetch(`/api/cms/booking-slots/${id}`, { method: 'DELETE' })
      if (handleUnauthorized(res)) return
      showToast('Créneau supprimé')
      loadBookingSlots()
    } catch {
      showToast('Erreur: Impossible de supprimer')
    }
  }

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/cms/booking-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (handleUnauthorized(res)) return
      showToast('Statut mis à jour')
      loadBookingRequests()
    } catch {
      showToast('Erreur: Impossible de mettre à jour')
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement depuis l'API à l'ouverture de l'onglet
  useEffect(() => { if (active) { loadBookingSlots(); loadBookingRequests() } }, [active, loadBookingSlots, loadBookingRequests])

  return {
    bookingSlots, bookingRequests, loadingSlots, savingSlot, newSlot, setNewSlot,
    loadBookingSlots, loadBookingRequests, saveNewSlot, deleteSlot, updateRequestStatus,
  }
}
