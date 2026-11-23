import { describe, it, expect } from 'vitest'
import { sniffImage } from '@/lib/image-sniff'

const bytes = (head: number[], total = 32) => Uint8Array.from([...head, ...new Array(Math.max(0, total - head.length)).fill(0)])
const text = (s: string) => new TextEncoder().encode(s.padEnd(32, ' '))

describe('sniffImage', () => {
  it('reconnaît JPEG, PNG, GIF et WebP par leur contenu', () => {
    expect(sniffImage(bytes([0xff, 0xd8, 0xff, 0xe0]))?.contentType).toBe('image/jpeg')
    expect(sniffImage(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe('png')
    expect(sniffImage(text('GIF89a'))?.contentType).toBe('image/gif')
    expect(sniffImage(text('RIFF....WEBPVP8 '))?.contentType).toBe('image/webp')
  })

  it('refuse le SVG, même renommé en .png ou annoncé comme image/png', () => {
    expect(sniffImage(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull()
    expect(sniffImage(text('<?xml version="1.0"?><svg/>'))).toBeNull()
  })

  it('refuse un fichier quelconque ou trop court', () => {
    expect(sniffImage(text('<html><script>alert(1)</script></html>'))).toBeNull()
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull()
  })

  it('un RIFF qui n’est pas du WebP (ex. WAV) est refusé', () => {
    expect(sniffImage(text('RIFF....WAVEfmt '))).toBeNull()
  })
})
