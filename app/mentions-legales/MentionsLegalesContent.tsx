'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCmsContent } from '@/hooks/useCmsContent'
import { MENTIONS_LEGALES_DEFAULTS } from '@/lib/cms-defaults/mentions-legales'
import Rich from '@/components/Rich'



export default function MentionsLegalesContent() {
  const c = useCmsContent('mentions-legales', MENTIONS_LEGALES_DEFAULTS)
  return (
    <>
      <Header />
      <main className="min-h-screen py-20 px-6 md:px-10" style={{ backgroundColor: 'var(--hh-bg)' }}>
        <div className="mx-auto max-w-3xl">

          {/* Titre */}
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--hh-accent)' }}>{c.t_cadre_legal}</p>
            <h1 className="text-4xl font-light" style={{ fontFamily: 'Cormorant Garamond, Playfair Display, serif', color: 'var(--hh-dark)' }}>
              {c.t_mentions_legales}
            </h1>
            <div className="mx-auto mt-4 w-12 h-px" style={{ backgroundColor: 'var(--hh-accent)' }} />
            <p className="mt-4 text-sm" style={{ color: '#4a6862' }}>{c.t_derniere_mise_a_jour}</p>
          </div>

          <div className="space-y-10 text-sm leading-relaxed" style={{ color: 'var(--hh-dark)' }}>

            {/* Éditeur */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>
                {c.t_identite_de_l_editeur}
              </h2>
              <div className="space-y-1" style={{ color: '#3d3d3d' }}>
                <p><Rich text={c.t_nom_commercial_happy_humans} /></p>
                <p><Rich text={c.t_responsable_monica_schneider} /></p>
                <p><Rich text={c.t_activite_philo_coaching_executive} /></p>
                <p><strong>{c.t_email}</strong>{' '}
                  <a href={`mailto:${c.t_happyhumans_coaching_gmail_com}`} style={{ color: 'var(--hh-primary)' }}>
                    {c.t_happyhumans_coaching_gmail_com}
                  </a>
                </p>
                <p><strong>{c.t_site}</strong>{' '}
                  <a href={`https://${c.t_happyhumans_vercel_app}`} style={{ color: 'var(--hh-primary)' }}>
                    {c.t_happyhumans_vercel_app}
                  </a>
                </p>
              </div>
            </section>

            {/* Hébergeur */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>
                {c.t_hebergeur}
              </h2>
              <div className="space-y-1" style={{ color: '#3d3d3d' }}>
                <p><Rich text={c.t_societe_vercel_inc} /></p>
                <p><Rich text={c.t_adresse_340_pine_street} /></p>
                <p><strong>{c.t_site_2}</strong>{' '}
                  <a href={`https://${c.t_vercel_com}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hh-primary)' }}>
                    {c.t_vercel_com}
                  </a>
                </p>
              </div>
            </section>

            {/* Base de données */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>
                {c.t_base_de_donnees}
              </h2>
              <div className="space-y-1" style={{ color: '#3d3d3d' }}>
                <p><Rich text={c.t_service_supabase_supabase_inc} /></p>
                <p><strong>{c.t_site_3}</strong>{' '}
                  <a href={`https://${c.t_supabase_com}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hh-primary)' }}>
                    {c.t_supabase_com}
                  </a>
                </p>
              </div>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>
                {c.t_propriete_intellectuelle}
              </h2>
              <p style={{ color: '#3d3d3d' }}>
                {c.t_l_ensemble_des_contenus}
              </p>
              <p className="mt-2" style={{ color: '#3d3d3d' }}>
                {c.t_credits_photo_happy_humans}
              </p>
            </section>

            {/* Limitation de responsabilité */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>
                {c.t_limitation_de_responsabilite}
              </h2>
              <p style={{ color: '#3d3d3d' }}>
                {c.t_happy_humans_s_efforce}
              </p>
            </section>

            {/* Contact légal */}
            <section>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem' }}>
                {c.t_contact}
              </h2>
              <p style={{ color: '#3d3d3d' }}>
                {c.contact_intro}{' '}
                <a href={`mailto:${c.t_happyhumans_coaching_gmail_com_2}`} style={{ color: 'var(--hh-primary)' }}>
                  {c.t_happyhumans_coaching_gmail_com_2}
                </a>.
              </p>
            </section>

            {/* Copyright */}
            <section className="pt-6 border-t" style={{ borderColor: 'var(--hh-accent-light)' }}>
              <p className="text-xs" style={{ color: '#4a6862' }}>
                {c.t_2026_happy_humans_monica}
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
