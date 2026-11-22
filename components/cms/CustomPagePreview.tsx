'use client'

import React from 'react'
import { CustomBlockView } from '@/components/CustomSections'
import { pageHref, type CustomPage } from '@/lib/custom-pages'

/**
 * Aperçu en direct d'une page libre : le titre, l'accroche et les blocs sont dessinés par les mêmes composants que la
 * page publique, à partir de ce qui est en cours de saisie (même non enregistré). Réduit à 55 % pour tenir à côté du formulaire.
 */
export default function CustomPagePreview({ page }: { page: CustomPage }) {
  return (
    <div data-testid="page-preview" style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
      <div style={{ padding: '.6rem 1rem', borderBottom: '1px solid #eee', fontSize: '.78rem', color: '#777', display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}>
        <span><strong style={{ color: '#2d5f54' }}>Aperçu en direct</strong> · {pageHref(page.slug || '…')}</span>
        <span>{page.published ? '🟢 en ligne' : '⚪ hors ligne'}</span>
      </div>
      <div style={{ maxHeight: '75vh', overflowY: 'auto', background: '#f5f0e8' }}>
        <div style={{ zoom: 0.55 }}>
          <section className="bg-[#f5f0e8] px-6 py-20 text-center md:px-10 md:py-24">
            <h1 className="mx-auto max-w-3xl font-serif text-3xl font-light text-stone-900 md:text-5xl">{page.title || 'Titre de la page'}</h1>
            {page.intro && <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed text-stone-600 md:text-lg">{page.intro}</p>}
          </section>
          {page.blocks.map(b => <CustomBlockView key={b.id} b={b} />)}
          {page.blocks.length === 0 && <p style={{ textAlign: 'center', padding: '3rem', color: '#999', fontSize: '1rem' }}>Aucun bloc pour l’instant : ajoutez-en à gauche.</p>}
        </div>
      </div>
    </div>
  )
}
