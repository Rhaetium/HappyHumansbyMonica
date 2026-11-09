import { NextRequest, NextResponse } from 'next/server';
// Écriture réservée au CMS : la clé publique n'a plus aucun droit d'écriture
// (migration 20261109000000_rls_verrouillage.sql).
import { getSupabaseServer } from '@/lib/supabase-server';
import { requireCmsAuth } from '@/lib/cms-auth';

const CONTENT_UPDATES: { slug: string; content: string }[] = [
  { slug: `madere-slow-travel-guide`, content: `<article class="prose-happyhumans">
<p class="lead">On a posé les valises à Madère pour la première fois en mars 2024. On pensait rester dix jours. On est restés seize. Ce n'est pas un accident — c'est Madère qui fait ça.</p>
<p>L'île est petite (57 km sur 22), volcanique, vertigineuse. Elle tombe dans l'Atlantique par des falaises de 600 mètres. Elle monte jusqu'à 1862 mètres au Pico Ruivo. Entre les deux, un réseau de 2000 kilomètres de levadas — ces canaux d'irrigation du XVe siècle qu'on a transformés en sentiers de randonnée. C'est le terrain de jeu coaching philosophique le plus dense d'Europe.</p>
<h2>Pourquoi Madère est faite pour le coaching philosophique</h2>
<p>La plupart des voyageurs font Madère en 5 jours. Ils voient Funchal, le téléphérique, le marché, Monte. Ils rentrent en disant que c'est beau. Ils ont raison. Mais ils ont raté l'essentiel.</p>
<p>L'essentiel, c'est le nord. C'est Santana et ses maisons à toit de chaume. C'est São Vicente et sa côte sauvage. C'est Fanal et ses tilleuls centenaires dans le brouillard à 6h du matin. C'est le paysan qui cultive encore ses patates douces en terrasses au-dessus de Porto Moniz. C'est la table d'une vieille dame à Câmara de Lobos qui te sert un prego no bolo do caco sans te demander si tu parles portugais.</p>
<p>Tout ça prend du temps. Du vrai temps. Pas une heure entre deux spots Instagram.</p>
<h2>Nos levadas hors des sentiers battus</h2>
<p>La Levada do Caldeirão Verde est magnifique et bondée. La Levada das 25 Fontes aussi. Voici nos alternatives moins fréquentées :</p>
<ul>
<li><strong>Levada do Moinho</strong> (Ponta do Sol) — longe des quintas abandonnées et des bananiers sauvages. Moins de 5 randonneurs par jour en semaine.</li>
<li><strong>Levada do Rei</strong> (São Jorge) — traverse la forêt laurissilve primaire. Humide, mystérieux, silence absolu.</li>
<li><strong>Vereda da Encumeada</strong> — crête centrale entre nord et sud. Vue sur les deux côtes par temps clair. Très physique mais transcendant.</li>
</ul>
<h2>Où dormir autrement</h2>
<p>Funchal a d'excellents hôtels. On y dormait la première nuit, puis on fuyait dans les quintas de l'intérieur. Nos recommandations terrain :</p>
<ul>
<li><strong>Quinta do Furão</strong> (Santana) — ancienne quinta viticole sur les falaises du nord. Vue sur l'Atlantique depuis le lit. Restaurant gastronomique avec légumes du jardin.</li>
<li><strong>Casa de Colmo</strong> (Santana) — maison traditionnelle à toit de chaume reconvertie. Tenue par une famille locale depuis trois générations.</li>
<li><strong>Airbnbs de l'intérieur</strong> — les villages de Curral das Freiras et Ribeira Brava offrent des maisons de pierre à louer à prix doux. C'est là qu'on mange avec les locaux.</li>
</ul>
<h2>Tables de pêcheurs : où manger vrai</h2>
<p>La règle à Madère : plus c'est simple, mieux c'est. Les meilleures tables sont celles sans carte en anglais.</p>
<ul>
<li><strong>Espada à la sauce de fruit de la passion</strong> — le poisson emblématique de l'île. Le meilleur qu'on ait mangé : O Celeiro, à Câmara de Lobos, midi en semaine, sans réservation.</li>
<li><strong>Lapas grillées</strong> (patelles) — des coquillages grillés au beurre d'ail sur une plaque de pierre. Incontournable dans tout bar de bord de mer.</li>
<li><strong>Bolo do caco</strong> — le pain plat à la patate douce cuit sur pierre. Accompagne tout, se mange à toute heure.</li>
</ul>
<h2>✦ Verdict Happy Humans</h2>
<blockquote>
<p>Madère est l'île qui nous a appris à vraiment ralentir. Pas parce qu'il n'y a rien à faire — il y a trop à faire. Mais parce que chaque endroit mérite plus d'une heure. Chaque levada mérite l'aube. Chaque table mérite la conversation qui suit le repas. Seize jours ne suffisaient pas. On y retourne en octobre.</p>
<p><em>— Happy Humans, mars 2024 et octobre 2025, deux séjours complets</em></p>
</blockquote>
</article>` },
  { slug: `guide-pratique-comment-debuter-le-slow-travel-en-duo`, content: `<article class="prose-happyhumans">
<p class="lead">On était comme toi. Deux semaines de vacances par an, un vol low-cost, un hôtel TripAdvisor, un programme de 14 villes en 10 jours. On rentrait épuisés en disant qu'on avait "bien voyagé". On mentait — à nous-mêmes d'abord.</p>
<p>Le virage coaching philosophique s'est fait brutalement, un dimanche soir à Porto. On était assis sur les marches d'une église, à regarder les gens vivre leur dimanche. Et on a réalisé qu'on n'avait rien vu de Porto depuis trois jours qu'on y était — on avait coché Porto, pas vécu Porto.</p>
<h2>Ce que le coaching philosophique n'est pas</h2>
<p>Pas besoin de partir six mois en van. Pas besoin de tout quitter. Le coaching philosophique n'est pas une philosophie de vie radicale — c'est une façon différente d'organiser le temps qu'on a déjà.</p>
<p>La règle qu'on s'est donnée : <strong>jamais plus d'une ville principale par semaine</strong>. Le reste, c'est du bonus.</p>
<h2>Les 5 principes qu'on applique en duo</h2>
<ol>
<li><strong>Une base fixe, des rayons.</strong> On choisit un appartement (pas un hôtel — une vraie cuisine, un vrai quartier) et on fait des allers-retours. On habite un endroit au lieu de le traverser.</li>
<li><strong>Le matin appartient à la ville.</strong> Lever à 7h, café acheté à la boulangerie du coin, pas à l'hôtel. Les villes ont un rythme du matin qui disparaît à 10h avec les touristes.</li>
<li><strong>Aucune obligation de tout voir.</strong> On a un musée non-visité à chaque destination. On assume. Un musée de moins = deux heures de flânerie en plus.</li>
<li><strong>Les transports locaux uniquement.</strong> Bus, tram, vélo. Jamais de taxi touristique ni de bus hop-on hop-off. On se perd, on demande, on rencontre.</li>
<li><strong>Un repas par jour "vraiment local".</strong> Pas au restaurant — à la boulangerie, au marché couvert, chez l'habitant si possible. C'est là que se passe la vrai vie.</li>
</ol>
<h2>Comment commencer dès ton prochain voyage</h2>
<p>Pas besoin de refondre toute ta façon de voyager d'un coup. Commence par un seul changement :</p>
<p><strong>Choisis une destination et réserve 5 nuits minimum.</strong> Une seule. Pas de city-trip 3 jours + extension 2 jours ailleurs. Cinq nuits dans la même ville, le même appartement, le même quartier. Tu verras la différence dès le troisième matin.</p>
<h2>Le duo : un avantage coaching philosophique</h2>
<p>Voyager en couple ralentit naturellement. On négocie le programme, on s'arrête quand l'un veut s'arrêter, on prend le temps du café que l'autre attendait. Ce qui peut sembler une friction est en réalité la meilleure contrainte coaching philosophique qui soit.</p>
<p>On a arrêté d'utiliser des applications de planification. Un carnet papier, stylo, et la règle : si on ne peut pas l'écrire à la main en moins de dix minutes, le programme est trop chargé.</p>
<h2>✦ Verdict Happy Humans</h2>
<blockquote>
<p>Le coaching philosophique en duo, c'est choisir la profondeur plutôt que la largeur. Une ville vraiment vécue vaut dix villes survolées. Et la meilleure souvenir de voyage ne vient jamais d'un monument — il vient d'un moment imprévu, dans une ruelle qu'on n'avait pas prévu de traverser, avec quelqu'un qu'on n'avait pas prévu de rencontrer.</p>
<p><em>— Happy Humans, appliqué depuis 2019, affiné à chaque voyage</em></p>
</blockquote>
</article>` },
  { slug: `urbex-paris-safe`, content: `<article class="prose-happyhumans">
<p class="lead">L'urbex, c'est explorer des lieux abandonnés ou méconnus. À Paris, ça évoque les catacombes illégales, les toits interdits, les friches industrielles. C'est excitant — et souvent illégal. On te propose autre chose : l'urbex légal, accessible, et franchement plus intéressant pour les non-adrénalomanes.</p>
<p>On a passé trois mois à explorer Paris autrement. Voici nos pépites dénichées — toutes accessibles, toutes légales, aucune sur les listes Airbnb Experience.</p>
<h2>La Petite Ceinture : 35 km de friche végétale</h2>
<p>L'ancienne voie ferrée intérieure de Paris, abandonnée depuis 1934, court sur 35 kilomètres autour de la capitale. Certains tronçons sont officiellement ouverts au public. D'autres sont... tolérés.</p>
<p>Notre tronçon préféré : <strong>le 14e arrondissement</strong>, entre la Porte de Vanves et la Porte d'Orléans. La végétation a tout repris — des frênes de dix mètres poussent entre les rails. Du street art recouvre les murs de soutènement. Par une matinée brumeuse d'automne, c'est l'endroit le plus surréaliste de Paris.</p>
<p><strong>Accès :</strong> Entrée officielle rue Brancion (14e). Ouvert le weekend, parfois en semaine selon les associations qui gèrent le site.</p>
<h2>Les Magasins Généraux de Pantin</h2>
<p>À deux stations de métro de la Gare de l'Est, les anciens entrepôts des Magasins Généraux de Pantin ont été transformés en campus créatif. L'architecture industrielle des années 1920 est intacte — béton brut, charpentes métalliques, cours intérieures monumentales.</p>
<p>C'est le siège de BETC Paris (une des plus grandes agences de pub françaises), mais les espaces extérieurs sont publics. On peut déambuler librement, photographier, s'asseoir dans la cour.</p>
<h2>Le Square des Batignolles : le marais caché</h2>
<p>Pas une friche, pas de l'urbex au sens strict — mais un lieu que personne ne connaît en dehors du 17e. Un jardin à l'anglaise avec un vrai marais naturel, des canards, des saules pleureurs centenaires. À dix minutes à pied de la Place de Clichy, dans un Paris qui ressemble à la campagne anglaise.</p>
<p>On y va le dimanche matin à 8h, quand les familles du quartier arrivent pour leur promenade. C'est l'un de nos rituels parisiens préférés.</p>
<h2>La Halle Pajol : cathédrale solaire</h2>
<p>Dans le 18e, une ancienne halle ferroviaire de 1926 convertie en espace de vie — bibliothèque, auberge de jeunesse, jardin urbain, panneaux solaires. La structure métallique d'origine est conservée. Sous la verrière, la lumière change toutes les heures.</p>
<p>On y vient travailler avec nos laptops. Le café du rez-de-chaussée est ouvert au public, les prix sont raisonnables, et l'architecture vaut n'importe quel musée.</p>
<h2>✦ Verdict Happy Humans</h2>
<blockquote>
<p>L'urbex légal à Paris, c'est comprendre que la ville cache ses meilleures pépites à ceux qui ne cherchent pas les monuments. La Petite Ceinture brumeuse d'octobre vaut n'importe quelle visite guidée. Et elle est gratuite, accessible en métro, et pratiquement vide à 8h du matin.</p>
<p><em>— Happy Humans, exploré sur trois mois d'arpentage parisien en 2025</em></p>
</blockquote>
</article>` },
  { slug: `madere-quand-partir-sur-lile-de-leternel-printemps`, content: `<article class="prose-happyhumans">
<p class="lead">Madère est surnommée l'île de l'éternel printemps. C'est vrai — et c'est trompeur. Le climat y est doux toute l'année, oui. Mais ce surnom cache une réalité plus nuancée : un nord sauvage et pluvieux, un sud ensoleillé, des sommets dans les nuages et des vallées inondées de lumière, parfois le même jour.</p>
<p>On l'a visitée en mars, en octobre et en novembre. Voici ce qu'on a vécu — sans filtre.</p>
<h2>Le paradoxe climatique de Madère</h2>
<p>Madère est une île volcanique très découpée. Les montagnes centrales atteignent 1800m. Résultat : le versant nord reçoit 3 fois plus de pluie que le versant sud. Quand il fait soleil sur Funchal, il peut pleuvoir à Fanal à 40 minutes de route.</p>
<p>Ce n'est pas un défaut — c'est ce qui rend l'île si luxuriante. La laurisilve, la forêt primaire classée UNESCO, ne serait pas possible sans cette humidité permanente.</p>
<h2>Mois par mois : notre avis terrain</h2>
<h3>Janvier – Février</h3>
<p>L'île est quasi-vide. Les prix sont au plus bas. Le temps est doux sur le sud (18-20°C) mais pluvieux sur les côtes nord. C'est la saison des mimosas — une explosion de jaune dans le vert.</p>
<p><strong>Pour qui :</strong> Les marcheurs qui veulent la solitude absolue.</p>
<h3>Mars – Avril</h3>
<p>Notre saison préférée. Les orchidées sauvages commencent à fleurir sur les levadas. Les températures grimpent à 20-23°C. Le Festival des Fleurs en mai est une raison supplémentaire de venir fin avril.</p>
<p><strong>Pour qui :</strong> Idéal pour tout le monde. Notre recommandation top.</p>
<h3>Juin – Août</h3>
<p>La haute saison. L'île est belle mais les levadas populaires sont encombrées dès 9h. Les prix explosent (+40%). Si tu viens en été, pars tôt le matin.</p>
<p><strong>Pour qui :</strong> Les familles, les baigneurs. Pas pour le coaching philosophique serein.</p>
<h3>Septembre – Octobre</h3>
<p>La lumière dorée de l'automne atlantique. Les touristes d'été sont partis. C'est la saison du vin — les vendanges en septembre sont un spectacle. Températures idéales (22-25°C).</p>
<p><strong>Pour qui :</strong> Notre deuxième saison préférée. Meilleur rapport qualité-prix-solitude.</p>
<h3>Novembre – Décembre</h3>
<p>Sous-estimé. L'île reprend son rythme local. Les prix chutent. La végétation est intense. Noël à Funchal est une fête — les illuminations sont réputées.</p>
<p><strong>Pour qui :</strong> Les voyageurs qui veulent voir l'île "vraie".</p>
<h2>Ce que la météo ne te dit pas</h2>
<p>Le bulletin météo de Funchal ne représente pas Madère. Conseil pratique : consulte les webcams sur <strong>webcamtaxi.com/madeira</strong> pour voir en temps réel les conditions sur l'île — indispensable pour planifier les randonnées en altitude.</p>
<h2>✦ Verdict Happy Humans</h2>
<blockquote>
<p>Il n'y a pas de mauvaise saison à Madère. Mars-avril pour la douceur et les fleurs. Octobre pour la lumière et la tranquillité. Évite juillet-août si tu veux vivre l'île plutôt que la subir. Et quelle que soit la saison : lève-toi tôt.</p>
<p><em>— Happy Humans, trois saisons testées sur place</em></p>
</blockquote>
</article>` },
  { slug: `pepites-mystiques-de-madere`, content: `<article class="prose-happyhumans">
<p class="lead">Il y a un endroit à Madère où on est restés silencieux pendant vingt minutes. Pas parce qu'on n'avait rien à dire. Parce que la forêt nous avait absorbés.</p>
<p>C'était à Fanal, à 6h30 du matin, dans le brouillard. Les tilleuls centenaires émergent de la brume comme des fantômes bienveillants. Aucun son humain. Juste les gouttelettes sur les feuilles, et quelque chose qu'on ne sait pas nommer.</p>
<h2>Fanal : la forêt hors du temps</h2>
<p>Fanal est notre pépite absolue de Madère. Un plateau à 1236m d'altitude dans le nord-ouest de l'île, couvert de tilleuls séculaires — certains ont 500 ans. Le matin, ils sont souvent dans les nuages, ce qui leur donne une atmosphère de conte nordique sous les tropiques.</p>
<p><strong>Comment y aller :</strong> Route forestière depuis Ribeira da Janela ou São Vicente. Le chemin ER209 est étroit et sinueux — conduis lentement. Préfère le lever du soleil pour la lumière et les nuages.</p>
<p><strong>Notre conseil :</strong> Va un jour de semaine avant 8h. L'endroit est à toi seul.</p>
<h2>La Chapelle Nossa Senhora do Faial</h2>
<p>À Faial, un village du nord côtier, une chapelle blanche perchée sur un rocher de basalte face à l'Atlantique. Elle date du XVIIe siècle. Autour d'elle, un cimetière de marins et une vue sur les falaises qui coupe le souffle.</p>
<p>Peu de touristes y viennent — la route d'accès est mal indiquée sur Google Maps. GPS : <em>32.764, -16.893</em> pour la trouver.</p>
<h2>Le Poço da Neve : la glacière oubliée</h2>
<p>Au sommet du Pico do Arieiro (1818m), une construction en pierre du XVIIIe siècle. C'était une glacière royale — on y stockait la neige de l'hiver pour la descendre en été à Funchal. Elle n'est jamais citée dans les guides. On l'a découverte en s'éloignant des sentiers balisés de 200 mètres.</p>
<h2>Curral das Freiras : le cirque caché</h2>
<p>«Le cirque des nonnes» — un village encerclé par des falaises de 1500m de tous côtés. Au XVIe siècle, les religieuses de Funchal s'y réfugiaient lors des attaques de pirates. Aujourd'hui, c'est une des communes les plus isolées de l'île.</p>
<p>La route pour y descendre est une série de lacets vertigineux. En bas : un village hors du temps, une seule rue principale. Le restaurant local sert une soupe de châtaignes qui réchauffe l'âme.</p>
<h2>✦ Verdict Happy Humans</h2>
<blockquote>
<p>Madère cache ses meilleures pépites à ceux qui prennent le temps de chercher. Aucun de ces endroits n'est sur les listes des "top 10 things to do". Tous demandent un réveil plus tôt, ou simplement de s'éloigner du chemin balisé de 200 mètres. C'est là que l'île révèle son âme.</p>
<p><em>— Happy Humans, pépites dénichées lors de trois séjours à Madère</em></p>
</blockquote>
</article>` },
  { slug: `prego-no-bolo-do-caco`, content: `<article class="prose-happyhumans">
<p class="lead">On a mangé beaucoup de choses à Madère. Des espadas à la sauce de fruit de la passion, du vin de Madère chaud sur les levadas, des ponchas artisanales dans des caves à Câmara de Lobos. Mais ce dont on parle encore à table, c'est d'un sandwich.</p>
<p>Un steak de bœuf mariné à l'ail et aux herbes, grillé sur feu de bois, glissé dans un bolo do caco chaud tartiné de beurre d'ail. Ce n'est pas une recette de chef étoilé. C'est la nourriture des travailleurs, vendue dans des snacks de bord de route, consommée debout ou sur un tabouret plastique. Et c'est l'une des meilleures choses qu'on ait mangées en Europe.</p>
<h2>C'est quoi le bolo do caco ?</h2>
<p>Le bolo do caco («pain de la pierre plate») est le pain traditionnel de Madère. Fait de patate douce, de farine de blé et de levure, il est cuit à plat sur une pierre de basalte chauffée au bois — le <em>caco</em>. Résultat : un pain plat légèrement élastique, avec une légère croûte et un cœur moelleux, presque comme une focaccia portugaise.</p>
<h2>Le prego : une histoire de marinade</h2>
<p>Le prego est un steak de bœuf fin mariné plusieurs heures dans de l'ail, du laurier, du vin blanc, du sel et du piri-piri. On le grille vif pour le garder rosé au centre. Glissé dans un bolo do caco ouvert et beurré, c'est le sandwich de toute une île. Chaque snack propose sa version — la marinade fait tout.</p>
<h2>Où trouver le meilleur prego</h2>
<p>La règle : évite les restaurants de la marina de Funchal. Cherche les snacks de bord de route sur les routes de montagne.</p>
<ul>
<li><strong>Les snacks de la route ER228</strong> entre Câmara de Lobos et Curral das Freiras — pas de nom, des enseignes en bois, des comptoirs en formica et des pregos parfaits à 4-6€.</li>
<li><strong>Mercado dos Lavradores, Funchal</strong> — des femmes en costume traditionnel vendent des bolos do caco chauds. Achetable seul ou en sandwich.</li>
</ul>
<h2>La recette maison</h2>
<h3>Ingrédients (pour 2)</h3>
<ul>
<li>2 steaks de bœuf fins, 150g chacun</li>
<li>4 gousses d'ail écrasées, 2 feuilles de laurier</li>
<li>100ml de vin blanc, 1 c. à soupe d'huile d'olive</li>
<li>Sel, poivre, piri-piri à goût</li>
<li>2 bolos do caco, beurre d'ail (beurre + ail + persil)</li>
</ul>
<h3>Préparation</h3>
<ol>
<li>Marine les steaks minimum 2h dans l'ail, le laurier, le vin, l'huile et le piri-piri.</li>
<li>Grille sur feu très vif, 1-2 minutes par face. Le centre doit rester rosé.</li>
<li>Réchauffe les bolos à la plancha, coupe-les en deux, beurre généreusement.</li>
<li>Glisse le steak dans le pain. Mange immédiatement.</li>
</ol>
<h2>✦ Verdict Happy Humans</h2>
<blockquote>
<p>Le prego no bolo do caco, c'est la quintessence de ce qu'on aime dans le coaching philosophique alimentaire : une recette simple, des ingrédients locaux, un savoir-faire transmis de snack en snack depuis des générations. Ce n'est pas dans les guides gastronomiques. C'est dans les mains d'une femme qui cuit son pain sur une pierre depuis quarante ans.</p>
<p><em>— Happy Humans, recette reçue de Maria, Câmara de Lobos, octobre 2025</em></p>
</blockquote>
</article>` },
];

export async function GET(request: NextRequest) {
  const authError = requireCmsAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const results = [];
  for (const update of CONTENT_UPDATES) {
    const { error } = await supabase
      .from('cms_blog_posts')
      .update({ content: update.content, updated_at: new Date().toISOString() })
      .eq('slug', update.slug);

    results.push({ slug: update.slug, error: error?.message || null });
  }

  return NextResponse.json({ success: true, results });
}
