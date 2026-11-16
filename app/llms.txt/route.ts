import { getKvSettings, isPageIndexable } from '@/lib/cms-settings-server'
import { getAllPosts } from '@/lib/blog-supabase'
import { SITE_URL } from '@/lib/site-url'

// llms.txt (GEO) : résumé lisible par les assistants IA — qui est Monica, ce qu'elle propose, où trouver quoi.
// Les réglages Géo du CMS (nom, métier, zone, adresse) alimentent le texte : rien n'est écrit en dur ici.
export const revalidate = 3600

const PAGES: { page: string; path: string; label: string; desc: string }[] = [
  { page: 'coaching', path: '/coaching', label: 'Coaching individuel', desc: 'Philo-coaching et executive coaching : programmes, tarifs, déroulé.' },
  { page: 'entreprises', path: '/entreprises', label: 'Entreprises', desc: 'Accompagnement des équipes, managers et dirigeants.' },
  { page: 'happiness-design', path: '/happiness-design', label: 'Happiness Design', desc: 'La méthode Happiness Design.' },
  { page: 'sparring-partner', path: '/sparring-partner', label: 'Sparring partner', desc: 'Un partenaire de réflexion pour dirigeants et décideurs.' },
  { page: 'relations', path: '/relations', label: 'Relations', desc: 'Accompagnement des relations (couple, famille, travail).' },
  { page: 'a-propos', path: '/a-propos', label: 'À propos', desc: 'Parcours, approche et valeurs de Monica Schneider.' },
  { page: 'temoignages', path: '/temoignages', label: 'Témoignages', desc: 'Retours de personnes accompagnées.' },
  { page: 'faq', path: '/faq', label: 'Questions fréquentes', desc: 'Séance découverte, public, déroulé, tarifs.' },
  { page: 'blog', path: '/blog', label: 'Blog', desc: 'Articles sur le coaching, le leadership et la philosophie appliquée.' },
  { page: 'booking', path: '/booking', label: 'Réserver une séance', desc: 'Prise de rendez-vous en ligne.' },
  { page: 'contact', path: '/contact', label: 'Contact', desc: 'Écrire à Monica.' },
]

export async function GET() {
  const kv = await getKvSettings()
  const name = kv.geo_person_name || 'Monica Schneider'
  const job = kv.geo_person_job_title || 'Executive Coach'
  const business = kv.geo_business_name || 'Happy Humans'
  const address = kv.geo_address || 'Paris, France'
  const area = kv.geo_service_area || 'Paris, France, Europe'
  const description =
    kv.seo_description ||
    "Philo-coaching, executive coaching, philosophical counselling et sparring partner pour particuliers et entreprises."

  const lines: string[] = [
    `# ${business}`,
    '',
    `> ${description}`,
    '',
    `${name} — ${job}. Basée à ${address}. Zone d'intervention : ${area}. Langues : français, anglais, roumain.`,
    '',
    '## Pages principales',
    ...PAGES.filter(p => isPageIndexable(kv, p.page)).map(p => `- [${p.label}](${SITE_URL}${p.path}): ${p.desc}`),
  ]

  if (isPageIndexable(kv, 'blog')) {
    try {
      const posts = (await getAllPosts()).slice(0, 30)
      if (posts.length) {
        lines.push('', '## Articles récents')
        for (const post of posts) {
          const excerpt = (post.excerpt ?? '').replace(/\s+/g, ' ').trim()
          lines.push(`- [${post.title}](${SITE_URL}/blog/${post.slug})${excerpt ? `: ${excerpt}` : ''}`)
        }
      }
    } catch {
      // Blog indisponible → llms.txt sans la liste d'articles
    }
  }

  lines.push('', '## Informations utiles', `- Site officiel : ${SITE_URL}`, `- Plan du site : ${SITE_URL}/sitemap.xml`, '')

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
