import { describe, it, expect } from 'vitest'
import { clearFailures, clientKey, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, recordFailure, retryAfterSeconds, type RateStore } from '@/lib/rate-limit'

const T0 = 1_000_000

describe('limite de tentatives', () => {
  it('ne bloque pas avant le seuil', () => {
    const store: RateStore = new Map()
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) recordFailure('ip', T0, store)
    expect(retryAfterSeconds('ip', T0, store)).toBe(0)
  })

  it('bloque au seuil et indique le temps restant', () => {
    const store: RateStore = new Map()
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordFailure('ip', T0, store)
    expect(retryAfterSeconds('ip', T0, store)).toBe(LOGIN_WINDOW_MS / 1000)
    expect(retryAfterSeconds('ip', T0 + 60_000, store)).toBe(LOGIN_WINDOW_MS / 1000 - 60)
  })

  it('débloque à la fin de la fenêtre', () => {
    const store: RateStore = new Map()
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordFailure('ip', T0, store)
    expect(retryAfterSeconds('ip', T0 + LOGIN_WINDOW_MS, store)).toBe(0)
    recordFailure('ip', T0 + LOGIN_WINDOW_MS, store)
    expect(retryAfterSeconds('ip', T0 + LOGIN_WINDOW_MS, store)).toBe(0)
  })

  it('une connexion réussie remet le compteur à zéro', () => {
    const store: RateStore = new Map()
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordFailure('ip', T0, store)
    clearFailures('ip', store)
    expect(retryAfterSeconds('ip', T0, store)).toBe(0)
  })

  it('compte chaque adresse séparément', () => {
    const store: RateStore = new Map()
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) recordFailure('a', T0, store)
    expect(retryAfterSeconds('b', T0, store)).toBe(0)
  })

  it('lit l’adresse du visiteur dans x-forwarded-for', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7')
    expect(clientKey(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
    expect(clientKey(new Headers())).toBe('inconnu')
  })
})
