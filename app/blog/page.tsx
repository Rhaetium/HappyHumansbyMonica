import type { Metadata } from 'next'
import { getAllPosts, formatDate } from '@/lib/blog-supabase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BlogClientPage from '@/components/BlogClientPage'
import { pageMetadata } from '@/lib/page-seo'
import { BLOG_DEFAULTS } from '@/lib/cms-defaults/blog'
import CmsServerContent from '@/components/CmsServerContent'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('blog', BLOG_DEFAULTS, {
    keywords: ['coaching', 'executive coaching', 'leadership', 'relations', 'happyhumans', 'Monica Schneider'],
  })
}

export default async function BlogPage() {
  const posts = await getAllPosts()
  const postsWithFormattedDate = posts.map((post) => ({
    ...post,
    formattedDate: formatDate(post.published_at),
  }))

  return (
    <CmsServerContent pages={{ 'blog': BLOG_DEFAULTS }}>
      <Header />
      <BlogClientPage posts={postsWithFormattedDate} />
      <Footer />
    </CmsServerContent>
  )
}
