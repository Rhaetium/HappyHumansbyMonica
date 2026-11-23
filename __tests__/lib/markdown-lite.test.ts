import { describe, it, expect } from 'vitest'
import { markdownToHtml } from '@/lib/markdown-lite'

describe('markdownToHtml', () => {
  it('convertit titres, paragraphes, listes, gras, italique et liens', () => {
    const html = markdownToHtml('## Titre\n\nUn **mot** et un *autre*.\nSuite.\n\n- un\n- deux\n\n1. a\n2. b\n\nVoir [Coaching](/coaching).')
    expect(html).toContain('<h2>Titre</h2>')
    expect(html).toContain('<p>Un <strong>mot</strong> et un <em>autre</em>. Suite.</p>')
    expect(html).toContain('<ul><li>un</li><li>deux</li></ul>')
    expect(html).toContain('<ol><li>a</li><li>b</li></ol>')
    expect(html).toContain('<a href="/coaching">Coaching</a>')
  })

  it('n’émet jamais de h1 (réservé au titre de la page)', () => {
    expect(markdownToHtml('# Grand titre')).toBe('<h2>Grand titre</h2>')
  })

  it('échappe toute balise et refuse les liens dangereux', () => {
    const html = markdownToHtml('<script>alert(1)</script> [x](javascript:alert(1))')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('href="javascript')
  })
})
