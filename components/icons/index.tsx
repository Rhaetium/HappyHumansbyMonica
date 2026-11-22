import type { SVGProps } from 'react'
import type { IconWeight } from '@phosphor-icons/react'
// Import direct de chaque icône (version « ssr » : utilisable dans un composant serveur comme dans un composant client)
import { BookOpenIcon } from '@phosphor-icons/react/dist/ssr/BookOpen'
import { ScanSmileyIcon } from '@phosphor-icons/react/dist/ssr/ScanSmiley'
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart'
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart'
import { LeafIcon } from '@phosphor-icons/react/dist/ssr/Leaf'
import { PlantIcon } from '@phosphor-icons/react/dist/ssr/Plant'
import { WavesIcon } from '@phosphor-icons/react/dist/ssr/Waves'
import { WindIcon } from '@phosphor-icons/react/dist/ssr/Wind'
import { LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass'
import { HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake'
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle'
import { TargetIcon } from '@phosphor-icons/react/dist/ssr/Target'
import { ShieldIcon } from '@phosphor-icons/react/dist/ssr/Shield'
import { BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase'
import { LinkIcon } from '@phosphor-icons/react/dist/ssr/Link'
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer'
import { NotePencilIcon } from '@phosphor-icons/react/dist/ssr/NotePencil'
import { ClipboardTextIcon } from '@phosphor-icons/react/dist/ssr/ClipboardText'
import { CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise'
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning'
import { WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench'
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle'
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check'

/**
 * Icônes du site : Phosphor (licence MIT, 6 graisses), qui remplacent les emojis.
 * Elles héritent de la couleur du texte (currentColor) : la couleur se règle avec une classe ou un style sur
 * l'icône ou sur son conteneur. Graisse « light » par défaut (trait fin, assorti à la typographie de la marque),
 * « thin » à partir de 48 px ; `weight` permet de choisir : thin, light, regular, bold, fill, duotone.
 *
 *   <Icon name="heart" className="text-[color:var(--hh-primary)]" size={34} />
 *   <Icon name="leaf" weight="duotone" />
 *
 * Pour ajouter une icône : importer son fichier ci-dessus et l'ajouter à ICONS.
 */
const ICONS = {
  book: BookOpenIcon,
  mirror: ScanSmileyIcon,
  heart: HeartIcon,
  'hand-heart': HandHeartIcon,
  leaf: LeafIcon,
  sprout: PlantIcon,
  wave: WavesIcon,
  wind: WindIcon,
  bolt: LightningIcon,
  search: MagnifyingGlassIcon,
  connect: HandshakeIcon,
  sparkle: SparkleIcon,
  target: TargetIcon,
  shield: ShieldIcon,
  briefcase: BriefcaseIcon,
  knot: LinkIcon,
  timer: TimerIcon,
  note: NotePencilIcon,
  clipboard: ClipboardTextIcon,
  calendar: CalendarIcon,
  refresh: ArrowsClockwiseIcon,
  alert: WarningIcon,
  link: LinkIcon,
  wrench: WrenchIcon,
  chat: ChatCircleIcon,
  check: CheckIcon,
}

export type IconName = keyof typeof ICONS

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name' | 'ref' | 'color' | 'weight'> & {
  name: IconName
  /** Côté en pixels (24 par défaut) ; une classe Tailwind h-* w-* peut aussi servir. */
  size?: number | string
  /** Graisse du trait (« light » par défaut, « thin » à partir de 48 px). */
  weight?: IconWeight
}

export function Icon({ name, size = 24, weight, ...rest }: IconProps) {
  const Glyph = ICONS[name]
  return <Glyph size={size} weight={weight ?? (Number(size) >= 48 ? 'thin' : 'light')} aria-hidden="true" focusable="false" {...rest} />
}

export const ICON_NAMES = Object.keys(ICONS) as IconName[]
