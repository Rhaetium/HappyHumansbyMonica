import { describe, it, expect } from 'vitest'
import { buildImageHtml } from '@/lib/carousel-html'

describe('buildImageHtml', () => {
  it('met la description dans alt, échappée', () => {
    expect(buildImageHtml('https://x.fr/a.jpg', 'Un "coucher" de <soleil>')).toContain('alt="Un &quot;coucher&quot; de &lt;soleil&gt;"')
  })
  it('sans description : alt vide (image décorative), comme avant', () => {
    expect(buildImageHtml('https://x.fr/a.jpg')).toContain('alt=""')
  })
  it('adresse vide : rien', () => {
    expect(buildImageHtml('  ', 'x')).toBe('')
  })
})
