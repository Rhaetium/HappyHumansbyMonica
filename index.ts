import { generateText } from 'ai'

// Vercel AI Gateway : la clé est lue automatiquement depuis AI_GATEWAY_API_KEY.
async function main() {
  const { text } = await generateText({
    model: 'moonshotai/kimi-k3',
    prompt:
      "Invente une nouvelle fête (un nom, la date ou la saison, son origine imaginaire) " +
      "et décris en quelques paragraphes les traditions qu'on y pratique. Réponds en français.",
  })

  console.log(text)
}

main().catch(error => {
  console.error('Échec de la génération :', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
