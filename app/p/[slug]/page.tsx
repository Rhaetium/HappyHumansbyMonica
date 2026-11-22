import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { CustomBlockView } from '@/components/CustomSections'
import { getPublishedCustomPage } from '@/lib/custom-pages-server'
import { pageHref } from '@/lib/custom-pages'
import { SITE_URL } from '@/lib/site-url'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

const DEFAULT_OG = `${SITE_URL}/og-default.jpg`

/**
 * Page créée entièrement dans le CMS (admin → « 📄 Pages libres »).
 * Contenu, adresse et SEO viennent de Supabase ; hors ligne ou supprimée → 404.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const page = await getPublishedCustomPage(slug)
  if (!page) return { title: 'Page introuvable' }

  const title = page.seoTitle || page.title
  const description = page.seoDescription || page.intro
  const image = page.seoImage || DEFAULT_OG
  const canonical = `${SITE_URL}${pageHref(page.slug)}`

  return {
    title,
    description: description || undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description: description || undefined,
      url: canonical,
      siteName: 'Happy Humans',
      locale: 'fr_FR',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description: description || undefined, images: [image] },
  }
}

export default async function CustomCmsPage(props: Props) {
  const { slug } = await props.params
  const page = await getPublishedCustomPage(slug)
  if (!page) notFound()

  return (
    <>
      <Header />
      <main className="pt-[72px]">
        <section className="bg-[color:var(--hh-bg)] px-6 py-20 text-center md:px-10 md:py-24">
          <h1 className="mx-auto max-w-3xl font-serif text-3xl font-light text-stone-900 md:text-5xl">{page.title}</h1>
          {page.intro && (
            <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed text-stone-600 md:text-lg">
              {page.intro}
            </p>
          )}
        </section>
        {page.blocks.map(b => (
          <CustomBlockView key={b.id} b={b} />
        ))}
      </main>
      <Footer />
    </>
  )
}
