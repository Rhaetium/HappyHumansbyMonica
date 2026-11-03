import { describe, it, expect } from 'vitest'
import {
  messageKind,
  matchesMessageFilter,
  unreadVisitorCount,
  unreadAlertCount,
} from '@/lib/cms-messages'

describe('messageKind', () => {
  it('reconnaît une alerte technique du site', () => {
    expect(messageKind('booking_alert')).toBe('alert')
  })

  it('traite un message de visiteur comme tel', () => {
    expect(messageKind('contact')).toBe('visitor')
  })

  it('ne masque jamais un message au type inconnu : il reste visible comme message de visiteur', () => {
    // Un type ajouté plus tard (ou absent) ne doit pas faire disparaître un vrai message reçu.
    expect(messageKind('autre_type')).toBe('visitor')
    expect(messageKind(null)).toBe('visitor')
    expect(messageKind(undefined)).toBe('visitor')
    expect(messageKind('')).toBe('visitor')
  })

  it('tolère les espaces autour du type', () => {
    expect(messageKind(' booking_alert ')).toBe('alert')
  })
})

describe('matchesMessageFilter', () => {
  const visitorUnread = { type: 'contact', status: 'unread' }
  const visitorRead = { type: 'contact', status: 'read' }
  const alertUnread = { type: 'booking_alert', status: 'unread' }
  const alertRead = { type: 'booking_alert', status: 'read' }

  it('« tous » garde tout', () => {
    for (const m of [visitorUnread, visitorRead, alertUnread, alertRead]) {
      expect(matchesMessageFilter(m, 'all')).toBe(true)
    }
  })

  it('« non lus » ne garde que ce qui n’est pas lu', () => {
    expect(matchesMessageFilter(visitorUnread, 'unread')).toBe(true)
    expect(matchesMessageFilter(alertUnread, 'unread')).toBe(true)
    expect(matchesMessageFilter(visitorRead, 'unread')).toBe(false)
    expect(matchesMessageFilter(alertRead, 'unread')).toBe(false)
  })

  it('« messages » ne garde que les visiteurs', () => {
    expect(matchesMessageFilter(visitorUnread, 'visitor')).toBe(true)
    expect(matchesMessageFilter(visitorRead, 'visitor')).toBe(true)
    expect(matchesMessageFilter(alertUnread, 'visitor')).toBe(false)
  })

  it('« alertes » ne garde que les alertes techniques', () => {
    expect(matchesMessageFilter(alertUnread, 'alert')).toBe(true)
    expect(matchesMessageFilter(alertRead, 'alert')).toBe(true)
    expect(matchesMessageFilter(visitorUnread, 'alert')).toBe(false)
  })
})

describe('unreadVisitorCount / unreadAlertCount', () => {
  const messages = [
    { type: 'contact', status: 'unread' },
    { type: 'contact', status: 'unread' },
    { type: 'contact', status: 'read' },
    { type: 'booking_alert', status: 'unread' },
    { type: 'booking_alert', status: 'read' },
  ]

  it('compte séparément les messages de visiteurs non lus et les alertes non lues', () => {
    expect(unreadVisitorCount(messages)).toBe(2)
    expect(unreadAlertCount(messages)).toBe(1)
  })

  it('vaut 0 quand tout est lu', () => {
    const allRead = messages.map(m => ({ ...m, status: 'read' }))
    expect(unreadVisitorCount(allRead)).toBe(0)
    expect(unreadAlertCount(allRead)).toBe(0)
  })
})
