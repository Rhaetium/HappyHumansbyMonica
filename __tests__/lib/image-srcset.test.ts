import { describe, expect, it } from 'vitest'
import { unsplashSrcSet } from '@/lib/image-srcset'

const photo = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85&auto=format&fit=crop'

describe('unsplashSrcSet', () => {
  it('propose plusieurs largeurs jusqu’à la taille d’origine', () => {
    const set = unsplashSrcSet(photo)!
    expect(set.split(', ').map(s => s.split(' ')[1])).toEqual(['480w', '768w', '1024w', '1280w', '1600w'])
  })

  it('ne change que la largeur : les autres réglages (qualité, format) sont conservés', () => {
    const first = unsplashSrcSet(photo)!.split(', ')[0].split(' ')[0]
    const url = new URL(first)
    expect(url.searchParams.get('w')).toBe('480')
    expect(url.searchParams.get('q')).toBe('85')
    expect(url.searchParams.get('auto')).toBe('format')
    expect(url.searchParams.get('fit')).toBe('crop')
  })

  it('ne dépasse jamais la taille d’origine', () => {
    const set = unsplashSrcSet('https://images.unsplash.com/photo-1?w=800&q=80')!
    expect(set.split(', ').map(s => s.split(' ')[1])).toEqual(['480w', '768w', '800w'])
  })

  it('ne touche pas aux autres sources ni aux adresses invalides', () => {
    expect(unsplashSrcSet('https://abc.supabase.co/storage/v1/object/public/x.jpg')).toBeUndefined()
    expect(unsplashSrcSet('/logo-happy-humans.png')).toBeUndefined()
    expect(unsplashSrcSet('blob:http://localhost/abc')).toBeUndefined()
    expect(unsplashSrcSet(undefined)).toBeUndefined()
  })

  it('ignore une photo Unsplash sans largeur ou déjà minuscule', () => {
    expect(unsplashSrcSet('https://images.unsplash.com/photo-1?q=80')).toBeUndefined()
    expect(unsplashSrcSet('https://images.unsplash.com/photo-1?w=400')).toBeUndefined()
  })
})
