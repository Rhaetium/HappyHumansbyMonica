import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import QuestionnaireRunner from '@/components/questionnaire/QuestionnaireRunner'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getTemplate(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const sb = createClient(url, key)
  const { data, error } = await sb
    .from('questionnaire_templates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    intro_text: data.intro_text,
    privacy_text: data.privacy_text,
    anonymous: data.anonymous,
    multi_step: data.multi_step,
    progress_label: data.progress_label,
    questions: Array.isArray(data.questions) ? (data.questions as Array<Record<string, unknown>>) : [],
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const template = await getTemplate(slug)

  return {
    title: template ? `${template.title} — Happy Humans` : 'Questionnaire — Happy Humans',
    description: template?.description ?? '',
  }
}

export default async function QuestionnairePage({ params }: PageProps) {
  const { slug } = await params
  const template = await getTemplate(slug)

  if (!template) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center text-slate-600">
        Ce questionnaire n’existe pas.
      </div>
    )
  }

  return <QuestionnaireRunner template={template} />
}
