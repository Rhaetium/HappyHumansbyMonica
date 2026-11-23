import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BookingTab from '@/components/cms/admin/BookingTab'
import MessagesTab from '@/components/cms/admin/MessagesTab'
import DashboardTab from '@/components/cms/admin/DashboardTab'
import ArticlesTab from '@/components/cms/admin/ArticlesTab'
import SettingsTab from '@/components/cms/admin/SettingsTab'
import type { Article, BookingRequest, BookingSlot, ContactMessage } from '@/components/cms/admin/types'

// Les onglets de l'admin ont été sortis de app/cms-admin/page.tsx : on vérifie qu'ils s'affichent sans erreur,
// à vide (premier chargement) comme avec des données.
const noop = () => {}
const asyncNoop = async () => {}

const article: Article = {
  id: 1, title: 'Un article', slug: 'un-article', category: 'Coaching',
  published: true, published_at: '2026-01-02', created_at: '2026-01-01', excerpt: 'Résumé', featured_image: '',
}
const slot: BookingSlot = {
  id: 's1', slot_date: '2026-12-01', slot_time: '10:00', slot_type: 'coaching',
  duration_minutes: 60, status: 'available', notes: null, created_at: '2026-01-01',
}
const request: BookingRequest = {
  id: 'r1', slot_id: 's1', client_name: 'Camille Martin', client_email: 'camille@exemple.test',
  client_phone: null, message: null, status: 'pending', created_at: '2026-01-01',
}
const message: ContactMessage = {
  id: 'm1', name: 'Alex', email: 'alex@exemple.test', message: 'Bonjour, je voudrais un rendez-vous.',
  type: 'contact', status: 'unread', created_at: '2026-01-01',
}

describe('onglets de l’admin du CMS', () => {
  it('Réservations : à vide', () => {
    const out = renderToStaticMarkup(
      <BookingTab bookingSlots={[]} bookingRequests={[]} loadingSlots={false} savingSlot={false}
        newSlot={{ date: '', time: '10:00', type: 'coaching', notes: '' }} setNewSlot={noop}
        loadBookingSlots={asyncNoop} saveNewSlot={asyncNoop} deleteSlot={asyncNoop} updateRequestStatus={asyncNoop} />,
    )
    expect(out).toContain('Aucun créneau')
    expect(out).toContain('Aucune demande')
  })

  it('Réservations : avec un créneau et une demande', () => {
    const out = renderToStaticMarkup(
      <BookingTab bookingSlots={[slot]} bookingRequests={[request]} loadingSlots={false} savingSlot={false}
        newSlot={{ date: '', time: '10:00', type: 'coaching', notes: '' }} setNewSlot={noop}
        loadBookingSlots={asyncNoop} saveNewSlot={asyncNoop} deleteSlot={asyncNoop} updateRequestStatus={asyncNoop} />,
    )
    expect(out).toContain('2026-12-01 à 10:00')
    expect(out).toContain('Camille Martin')
  })

  it('Messages : à vide, puis avec un message', () => {
    const empty = renderToStaticMarkup(
      <MessagesTab messages={[]} setMessages={noop} loadingMessages={false} messageFilter="all" setMessageFilter={noop} loadMessages={asyncNoop} />,
    )
    expect(empty).toContain('Aucun message pour le moment')
    const full = renderToStaticMarkup(
      <MessagesTab messages={[message]} setMessages={noop} loadingMessages={false} messageFilter="all" setMessageFilter={noop} loadMessages={asyncNoop} />,
    )
    expect(full).toContain('Bonjour, je voudrais un rendez-vous.')
    expect(full).toContain('Marquer lu')
  })

  it('Tableau de bord : sans article ni message, base de données connectée', () => {
    const out = renderToStaticMarkup(
      <DashboardTab healthChecks={null} articles={[]} setMessageFilter={noop} handleTabChange={noop}
        messages={[]} dbStatus="ok" openArticleEditor={noop} seoIssues={[]} />,
    )
    expect(out.length).toBeGreaterThan(200)
  })

  it('Tableau de bord : avec un article', () => {
    const out = renderToStaticMarkup(
      <DashboardTab healthChecks={[]} articles={[article]} setMessageFilter={noop} handleTabChange={noop}
        messages={[message]} dbStatus="down" openArticleEditor={noop} seoIssues={[]} />,
    )
    expect(out).toContain('Un article')
  })

  it('Articles : à vide, puis avec un article', () => {
    const base = { search: '', setSearch: noop, loadArticles: asyncNoop, statusFilter: 'all', setStatusFilter: noop,
      openArticleEditor: noop, duplicateArticle: asyncNoop, togglePublish: asyncNoop, deleteArticle: asyncNoop }
    expect(renderToStaticMarkup(<ArticlesTab {...base} loadingArticles={false} articles={[]} />).length).toBeGreaterThan(100)
    expect(renderToStaticMarkup(<ArticlesTab {...base} loadingArticles={false} articles={[article]} />)).toContain('Un article')
  })

  it('Paramètres : en chargement, puis vide', () => {
    const base = { settingsGroup: 'general', setSettingsGroup: noop, settings: [], editedSettings: {}, setEditedSettings: noop,
      handleImageFile: asyncNoop, saveSettings: asyncNoop, savingSettings: false }
    expect(renderToStaticMarkup(<SettingsTab {...base} loadingSettings={true} />).length).toBeGreaterThan(20)
    expect(renderToStaticMarkup(<SettingsTab {...base} loadingSettings={false} />).length).toBeGreaterThan(20)
  })
})
