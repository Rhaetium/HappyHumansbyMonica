// Textes par défaut de la page « À propos » — SOURCE UNIQUE.
// Lus par la page ET par l'admin du CMS (lib/cms-page-defaults.ts) : ne jamais les dupliquer ailleurs.
// Chaque clé correspond à un champ de PAGES_CONFIG (components/cms/admin/config.ts).

export const A_PROPOS_DEFAULTS: Record<string, string> = {
  hero_image:       'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1400&q=80&auto=format&fit=crop',
  hero_badge:       'À propos',
  page_title:       'Leadership coaching en profondeur',
  intro_text: "Monica Schneider est Executive Coach. Après dix ans en marketing international (Henkel, LVMH, L'Oréal), elle accompagne dirigeants, managers et personnes en transition, avec une approche qui mêle coaching, pratique philosophique et neurosciences. Elle est la créatrice de la méthode Happiness Design.",
  // Parcours section
  parcours_badge:   'Parcours',
  parcours_title:   'Le parcours',
  parcours_subtitle: 'Deviens qui tu es',
  // Bio paragraphs
  bio_p1: "Les 10 premières années de ma carrière ont été dédiées au marketing international : développement de produits, de marques, d'histoires et d'expériences inoubliables, en Allemagne, en France, au Royaume-Uni et en Europe de l'Est pour Henkel, LVMH et L'Oréal.",
  bio_p2: "En 2020, j'ai mis fin à l'aventure L'Oréal et j'ai exploré de nouvelles vies. Je me suis formée à l'Executive Coaching. Une des choses qui m'avait le plus animée a été le développement des individus et des équipes. À travers cette formation et le début de ma pratique, j'ai découvert que ce métier était fait pour moi.",
  bio_p3: "Dans le coaching, j'arrivais à créer un espace où mes clients trouvent le courage de se confronter à leurs limites, à leurs doutes et à leurs vulnérabilités pour réaliser une transformation libératrice qui les rapproche de qui ils sont, de leur puissance et de leur sourire le plus confiant. Être témoin et guide dans cette démarche est un honneur qui m'anime plus que tout.",
  bio_p4: "Pour enrichir mon approche et retrouver un de mes amours de jeunesse, j'ai également entrepris un Master de Pratique Philosophique. J'ai fait mon mémoire sur le bonheur. Deux grandes conclusions : 1. Ce n'est pas le bonheur qui fait la différence mais comment on réagit dans l'adversité / quand la vie ne va pas comme on veut. 2. Une discipline ne suffit pas. Il faut comprendre son cerveau (neurosciences), savoir créer son bonheur (psychologie positive), repérer quand son inconscient reprend le dessus (psychologie classique), entraîner le cerveau à réduire le cortisol (méditation) et à challenger ses pensées (pratique philosophique).",
  bio_p5: "Je me suis construit une boîte à outils que j'ai appliquée à ma propre vie au cours des 6 dernières années — Happiness Design. Je l'ai aussi intégrée dans mes coachings et cela a fait la différence pour mes clients.",
  bio_p6: "Aujourd'hui je continue à accompagner des individus ou des entreprises aux moments clés des carrières (promotion et prise de poste, transitions, reconversion), pour booster le sens et l'engagement (conseil en communication interne, team coaching) et même pendant les moments clés du reste de la vie (mariage, séparation, parentalité, deuil, retraite, fin de vie).",
  bio_p7: "Ma conviction, ligne directrice dans toutes mes interventions, est simple. Pour chaque nouvelle étape, nous devons entreprendre une transformation en tant qu'individu ou en tant qu'équipe. Je suis à vos côtés avec ma boîte à outils multidisciplinaire pour coller au mieux à votre chemin unique.",
  bio_p8: "Je souhaite aussi rendre cette boîte à outils du bonheur — même dans une vie chaotique — accessible au plus grand nombre. Ce projet s'appelle Happiness Design.",
  photo:            '/monica-schneider.jpg',
  // Accompagnement section
  acc_badge:       'Accompagnement',
  acc_title:       'Mes coachings et mentorings',
  acc_subtitle:    '2 approches complémentaires',
  coaching_label:   'Coaching',
  coaching_text:    "Le coaching est une danse entre le coach et le coaché. À travers les questions du coach, le coaché réfléchit, change de perspective, fait l'expérience de révélations, de aha moments et d'eurekas ! Il ou elle trouve en soi les meilleures solutions pour avancer sereinement vers son objectif. Le coaché design un plan d'action clair et daté. Il ressort de la séance avec un sentiment de clarté, une énergie renouvelée et souvent un sourire confiant. À noter que ma pratique de coaching est enrichie, quand la situation s'y prête, par de la philosophie pratique.",
  coaching_cta:    'Voir le coaching →',
  mentoring_label: 'Mentoring',
  mentoring_text:  "Je vous offre mes conseils sur une problématique alignée avec mon expertise. — Comment être visible tout en restant authentique ? — Comment démontrer du leadership et signaler que nous sommes prêts pour la next step ? — Quel plan de communication interne mettre en place pour rebooster l'engagement ? — Comment naviguer les différences de communication au sein d'environnements multiculturels ?",
  mentoring_cta:   'Me contacter →',
  // Happiness Design CTA
  hd_badge:        'Happiness Design',
  hd_text:         'Je souhaite rendre cette boîte à outils du bonheur, même dans une vie chaotique, accessible au plus grand nombre. Ce projet s\'appelle Happiness Design.',
  hd_cta:          "Pour en savoir plus, c'est par ici →",
  // Final CTA
  footer_cta_title: "Envie d'en savoir plus ?",
  footer_cta_coaching: 'Voir le coaching',
  footer_cta_booking:  'Réserver une séance (1h)',
  // ── Textes câblés automatiquement (étaient en dur dans la page) ──
  t_monica_schneider_executive_coach: "Monica Schneider — Executive Coach",
  t_monica_schneider: "Monica Schneider",
  t_ms: "MS",
  t_monica_schneider_2: "Monica Schneider",
  // ── Référencement (Google, réseaux sociaux) — lu par generateMetadata via lib/page-seo.ts ──
  seo_title: "Monica Schneider — Executive Coach",
  seo_description: "Monica Schneider, Executive Coach, 10 ans de marketing international (Henkel, LVMH, L'Oréal), master de pratique philosophique, créatrice de Happiness Design.",
  seo_image: '',
  // ── Disposition des sections (admin → Structure) : JSON {"order":[…],"hidden":[…]} ; vide = ordre d'origine ──
  sections_layout: '',
  custom_sections: '',
}
