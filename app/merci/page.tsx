'use client'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCmsContent } from '@/hooks/useCmsContent'
import { MERCI_DEFAULTS } from '@/lib/cms-defaults/merci'
import Rich from '@/components/Rich'

export default function MerciPage() {
  const c = useCmsContent('merci', MERCI_DEFAULTS)
  return (
    <>
      <Header />
      <main className="min-h-screen pt-[72px] bg-[color:var(--hh-bg)] flex items-center justify-center px-6 py-24">
        <div className="max-w-xl mx-auto text-center">

          {/* Icône succès SVG */}
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-[color:var(--hh-bg)] flex items-center justify-center">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#2d5f54" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <p className="text-amber-800 text-xs font-bold tracking-[0.22em] uppercase mb-4">{c.t_message_recu}</p>
          <h1 className="text-3xl md:text-4xl font-serif font-light text-stone-900 mb-5 leading-tight">
            {c.t_merci_pour_votre_message}
          </h1>
          <p className="text-stone-600 leading-relaxed mb-4"><Rich text={c.t_monica_vous_repondra_personnelleme} /></p>
          <p className="text-stone-500 text-sm mb-10">
            {c.t_en_attendant_vous_pouvez}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/relations"
              className="px-6 py-3 bg-[color:var(--hh-primary)] hover:bg-[color:var(--hh-dark)] text-white rounded-full font-semibold text-sm transition"
            >
              {c.t_explorer_les_relations}
            </Link>
            <Link
              href="/booking"
              className="px-6 py-3 border border-[color:var(--hh-primary)] text-[color:var(--hh-primary)] hover:bg-[color:var(--hh-primary)] hover:text-white rounded-full font-semibold text-sm transition"
            >
              {c.t_reserver_une_seance}
            </Link>
          </div>

          <div className="mt-12 p-5 bg-white border border-stone-200 rounded-2xl text-sm text-stone-600">
            <p className="font-semibold text-stone-800 mb-1">{c.t_pas_de_reponse_recue}</p>
            <p><Rich text={c.t_verifiez_votre_dossier_spam} linkClassName="text-[color:var(--hh-primary)] underline" /></p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
