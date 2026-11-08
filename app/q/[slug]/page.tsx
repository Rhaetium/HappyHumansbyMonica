import Header from '@/components/Header'
import Footer from '@/components/Footer'
import QuestionnaireForm from './QuestionnaireForm'

// Page publique d'un questionnaire, ouverte depuis un QR code. Le contenu vient de la base.
export default async function QuestionnairePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <>
      <Header />
      <main className="min-h-[70vh] bg-[#f7f4ef] pt-[72px]">
        <QuestionnaireForm slug={slug} />
      </main>
      <Footer />
    </>
  )
}
