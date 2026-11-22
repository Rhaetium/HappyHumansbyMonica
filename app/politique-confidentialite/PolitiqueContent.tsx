'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCmsContent } from '@/hooks/useCmsContent'
import { POLITIQUE_CONFIDENTIALITE_DEFAULTS } from '@/lib/cms-defaults/politique-confidentialite'
import Rich from '@/components/Rich'



export default function PolitiqueContent() {
  const c = useCmsContent('politique-confidentialite', POLITIQUE_CONFIDENTIALITE_DEFAULTS)
  return (
    <>
      <Header />
      <main className="min-h-screen py-20 px-6 md:px-10" style={{ backgroundColor: 'var(--hh-bg)' }}>
        <div className="mx-auto max-w-3xl">

          {/* Titre */}
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--hh-accent)' }}>{c.t_donnees_personnelles}</p>
            <h1 className="text-4xl font-light" style={{ fontFamily: 'Cormorant Garamond, Playfair Display, serif', color: 'var(--hh-dark)' }}>
              {c.t_politique_de_confidentialite}
            </h1>
            <div className="mx-auto mt-4 w-12 h-px" style={{ backgroundColor: 'var(--hh-accent)' }} />
            <p className="mt-4 text-sm" style={{ color: '#4a6862' }}>{c.t_derniere_mise_a_jour}</p>
          </div>

          <div className="space-y-10 text-sm leading-relaxed" style={{ color: 'var(--hh-dark)' }}>

            {/* Responsable */}
            <section>
              <h2 className="text-lg mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600 }}>
                {c.t_responsable_du_traitement}
              </h2>
              <p style={{ color: '#3d3d3d' }}>
                <strong>{c.t_happy_humans_monica_schneider}</strong><br />
                {c.email_label} <a href={`mailto:${c.t_happyhumans_coaching_gmail_com}`} style={{ color: 'var(--hh-primary)' }}>{c.t_happyhumans_coaching_gmail_com}</a>
              </p>
            </section>

            {/* Données collectées */}
            <section>
              <h2 className="text-lg mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600 }}>
                {c.t_donnees_collectees}
              </h2>
              <p style={{ color: '#3d3d3d' }}>{c.t_nous_collectons_uniquement_les}</p>
              <ul className="mt-2 space-y-1 list-disc list-inside" style={{ color: '#3d3d3d' }}>
                <li>{c.t_nom_et_adresse_email}</li>
                <li>{c.t_nom_email_type_de}</li>
                <li>{c.t_resultats_du_test_de}</li>
              </ul>
            </section>

            {/* Finalités */}
            <section>
              <h2 className="text-lg mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600 }}>
                {c.t_finalites_du_traitement}
              </h2>
              <ul className="space-y-1 list-disc list-inside" style={{ color: '#3d3d3d' }}>
                <li>{c.t_repondre_a_vos_demandes}</li>
                <li>{c.t_organiser_et_assurer_le}</li>
                <li>{c.t_respecter_les_obligations_legales}</li>
              </ul>
            </section>

            {/* Durée de conservation */}
            <section>
              <h2 className="text-lg mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600 }}>
                {c.t_duree_de_conservation}
              </h2>
              <p style={{ color: '#3d3d3d' }}>{c.t_2_ans_maximum_pour}</p>
              <p style={{ color: '#3d3d3d' }}>{c.t_les_resultats_anonymes_du}</p>
            </section>

            {/* Sous-traitants */}
            <section>
              <h2 className="text-lg mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600 }}>
                {c.t_hebergement_et_sous_traitants}
              </h2>
              <p style={{ color: '#3d3d3d' }}><Rich text={c.t_les_donnees_peuvent_etre} /></p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-lg mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600 }}>
                {c.t_cookies}
              </h2>
              <p style={{ color: '#3d3d3d', fontWeight: 600 }}>{c.t_pas_de_cookies_tiers}</p>
              <p style={{ color: '#3d3d3d', fontWeight: 600 }}>{c.t_pas_de_publicite}</p>
              <p style={{ color: '#3d3d3d', fontWeight: 600 }}>{c.t_pas_de_partage_avec}</p>
              <p style={{ color: '#3d3d3d' }} className="mt-2">
                {c.t_les_cookies_strictement_necessaire}
              </p>
            </section>

            {/* Vos droits */}
            <section>
              <h2 className="text-lg mb-3" style={{ color: 'var(--hh-primary)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600 }}>
                {c.t_vos_droits_rgpd}
              </h2>
              <p style={{ color: '#3d3d3d' }}>{c.t_conformement_au_rgpd_vous}</p>
              <ul className="mt-2 space-y-1 list-disc list-inside" style={{ color: '#3d3d3d' }}>
                <li>{c.t_l_acces_a_vos}</li>
                <li>{c.t_la_rectification_de_donnees}</li>
                <li>{c.t_l_effacement_de_vos}</li>
                <li>{c.t_la_limitation_ou_l}</li>
              </ul>
              <p style={{ color: '#3d3d3d' }} className="mt-3">
                {c.rights_intro}{' '}
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
