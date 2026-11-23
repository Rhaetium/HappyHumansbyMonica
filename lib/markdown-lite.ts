// Markdown minimal → HTML pour l'éditeur d'articles (le brouillon de l'IA arrive en Markdown, l'éditeur attend du HTML).
// Couvre ce que produit lib/content-ai.ts : titres (##, ###), listes, gras, italique, liens. Tout le reste est du texte.
// Le texte est d'abord échappé : aucune balise venue du modèle n'est conservée. Logique pure, testée.

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>')
}

export function markdownToHtml(markdown: string): string {
  const out: string[] = []
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null
  let para: string[] = []

  const flushPara = () => { if (para.length) { out.push(`<p>${para.join(' ')}</p>`); para = [] } }
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null } }

  for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    const bullet = /^[-*]\s+(.+)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line)
    if (!line) { flushPara(); flushList(); continue }
    if (heading) {
      flushPara(); flushList()
      const level = Math.min(Math.max(heading[1].length, 2), 3) // h1 est réservé au titre de la page
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
    } else if (bullet || numbered) {
      flushPara()
      const tag = bullet ? 'ul' : 'ol'
      if (list && list.tag !== tag) flushList()
      if (!list) list = { tag, items: [] }
      list.items.push(inline((bullet ?? numbered)![1]))
    } else {
      flushList()
      para.push(inline(line))
    }
  }
  flushPara(); flushList()
  return out.join('\n')
}
