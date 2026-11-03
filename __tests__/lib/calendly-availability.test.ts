import { describe, it, expect } from 'vitest'
import {
  calendlyProfileSlug,
  calendlyProfileApiUrl,
  calendlyAvailabilityFromProfile,
} from '@/lib/calendly-availability'

describe('calendlyProfileSlug', () => {
  it('extrait le compte d’une adresse Calendly', () => {
    expect(calendlyProfileSlug('https://calendly.com/happyhumans-coaching')).toBe('happyhumans-coaching')
    expect(calendlyProfileSlug('https://calendly.com/happyhumans-coaching/')).toBe('happyhumans-coaching')
    expect(calendlyProfileSlug('http://calendly.com/monica-schneider?x=1')).toBe('monica-schneider')
  })

  it('ignore le chemin d’un rendez-vous et une éventuelle barre finale', () => {
    expect(calendlyProfileSlug('https://calendly.com/happyhumans-coaching/seance-decouverte')).toBe(
      'happyhumans-coaching',
    )
  })

  it('tolère une adresse sans schéma', () => {
    expect(calendlyProfileSlug('calendly.com/happyhumans-coaching')).toBe('happyhumans-coaching')
  })

  it('renvoie une chaîne vide quand il n’y a pas de compte', () => {
    expect(calendlyProfileSlug('')).toBe('')
    expect(calendlyProfileSlug(null)).toBe('')
    expect(calendlyProfileSlug(undefined)).toBe('')
    expect(calendlyProfileSlug('https://exemple.fr/machin')).toBe('')
  })
})

describe('calendlyProfileApiUrl', () => {
  it('construit l’adresse de l’API profil', () => {
    expect(calendlyProfileApiUrl('happyhumans-coaching')).toBe(
      'https://calendly.com/api/booking/profiles/happyhumans-coaching',
    )
  })

  it('renvoie une chaîne vide sans slug (rien à interroger)', () => {
    expect(calendlyProfileApiUrl('')).toBe('')
  })
})

describe('calendlyAvailabilityFromProfile', () => {
  it('détecte un compte sans rendez-vous public', () => {
    expect(
      calendlyAvailabilityFromProfile({
        slug: 'happyhumans-coaching',
        name: 'Monica Schneider',
        unavailability_reason: { code: 'profile_no_public', error: 'no openings at the moment' },
      }),
    ).toBe('unavailable')
  })

  it('reconnaît un compte public normal', () => {
    expect(
      calendlyAvailabilityFromProfile({
        slug: 'monica-schneider',
        name: 'Monica Schneider-Anthony',
        unavailability_reason: null,
      }),
    ).toBe('available')
  })

  it('reste prudent (« on ne sait pas ») sur une réponse inattendue', () => {
    // On ne doit jamais afficher un faux « aucune disponibilité » : dans le doute, l'agenda reste.
    expect(calendlyAvailabilityFromProfile(null)).toBe('unknown')
    expect(calendlyAvailabilityFromProfile(undefined)).toBe('unknown')
    expect(calendlyAvailabilityFromProfile([])).toBe('unknown')
    expect(calendlyAvailabilityFromProfile('nope')).toBe('unknown')
    expect(calendlyAvailabilityFromProfile({})).toBe('unknown')
    expect(calendlyAvailabilityFromProfile({ error: 'not found' })).toBe('unknown')
    expect(calendlyAvailabilityFromProfile({ unavailability_reason: null })).toBe('unknown')
  })
})
