import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { BookmarkSimpleIcon } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { BowlSteamIcon } from 'phosphor-react-native/src/icons/BowlSteam';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CoffeeIcon } from 'phosphor-react-native/src/icons/Coffee';
import { DotsThreeIcon } from 'phosphor-react-native/src/icons/DotsThree';
import { FlaskIcon } from 'phosphor-react-native/src/icons/Flask';
import { FlowerIcon } from 'phosphor-react-native/src/icons/Flower';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { LeafIcon } from 'phosphor-react-native/src/icons/Leaf';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { NotePencilIcon } from 'phosphor-react-native/src/icons/NotePencil';
import { PlantIcon } from 'phosphor-react-native/src/icons/Plant';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { SquaresFourIcon } from 'phosphor-react-native/src/icons/SquaresFour';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { colors } from '@/theme';

/**
 * Тонкие контурные иконки (Phosphor, начертание `light`). Каждая импортируется отдельным файлом,
 * чтобы в сборку не попал весь набор из полутора тысяч иконок. Новая иконка — строчка здесь.
 */
const ICONS = {
  back: ArrowLeftIcon,
  bookmark: BookmarkSimpleIcon,
  book: BookOpenIcon,
  bowl: BowlSteamIcon,
  calendar: CalendarBlankIcon,
  chevronRight: CaretRightIcon,
  close: XIcon,
  cup: CoffeeIcon,
  filter: SlidersHorizontalIcon,
  flask: FlaskIcon,
  flower: FlowerIcon,
  grid: SquaresFourIcon,
  heart: HeartIcon,
  home: HouseIcon,
  info: InfoIcon,
  leaf: LeafIcon,
  more: DotsThreeIcon,
  note: NotePencilIcon,
  plant: PlantIcon,
  plus: PlusIcon,
  search: MagnifyingGlassIcon,
  warning: WarningIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

/**
 * На вебе голый <svg> не «позиционирован» и рисуется под абсолютно расположенной бумажной подложкой
 * (PaperShape) соседнего уровня; position: relative возвращает иконке порядок по дереву, как на телефоне.
 */
const ICON_STYLE = { position: 'relative' } as const;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** `light` — обычные контурные; `regular` — чуть плотнее (активная вкладка); `fill` — залитое «сердце». */
  weight?: IconWeight;
}

export function Icon({ name, size = 24, color = colors.text, weight = 'light' }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} weight={weight} style={ICON_STYLE} />;
}
