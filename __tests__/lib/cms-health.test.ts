import { describe, it, expect } from 'vitest'
import { bookingHealthCheck, healthProblemCount, healthNeedsAttention } from '@/lib/cms-health'

describe('bookingHealthCheck', () => {
  const base = { profileUrl: 'https://calendly.com/happyhumans-coaching', slug: 'happyhumans-coaching' }

  it('signale une panne certaine quand le compte n’a aucun rendez-vous public', () => {
    const c = bookingHealthCheck({ ...base, availability: 'unavailable' })
    expect(c.level).toBe('error')
    expect(c.title).toContain('Réservation')
    expect(c.detail).toContain('happyhumans-coaching')
    // Le message doit dire quoi faire, sans jargon.
    expect(c.fix).toBeTruthy()
    expect(c.fix).toContain('Calendly')
  })

  it('reste en « ok » quand le compte a des rendez-vous publics', () => {
    const c = bookingHealthCheck({ ...base, availability: 'available' })
    expect(c.level).toBe('ok')
    expect(c.fix).toBeUndefined()
  })

  it('n’alarme pas quand la vérification a échoué : « unknown » n’est pas « cassé »', () => {
    const c = bookingHealthCheck({ ...base, availability: 'unknown' })
    expect(c.level).toBe('warn')
    // Un doute ne doit jamais afficher la même chose qu’une panne avérée.
    expect(c.level).not.toBe('error')
    expect(c.detail).toContain('happyhumans-coaching')
  })
})

describe('healthProblemCount / healthNeedsAttention', () => {
  const ok = { id: 'a', level: 'ok' as const, title: '', detail: '' }
  const warn = { id: 'b', level: 'warn' as const, title: '', detail: '' }
  const error = { id: 'c', level: 'error' as const, title: '', detail: '' }

  it('ne compte comme problème que les erreurs certaines', () => {
    expect(healthProblemCount([ok, warn, error])).toBe(1)
    expect(healthProblemCount([ok])).toBe(0)
  })

  it('ne fait remonter au tableau de bord que ce qui mérite attention', () => {
    expect(healthNeedsAttention([ok, warn, error]).map(c => c.id)).toEqual(['b', 'c'])
  })
})
