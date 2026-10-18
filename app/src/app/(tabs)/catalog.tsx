import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  CATALOG_SECTIONS,
  catalogGroups,
  collectNow,
  countRu,
  filterForGroup,
  monthName,
  type CatalogKey,
} from '@travy/shared';
import { ListRow, Screen, ScreenTitle, SearchField, type IconName } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';

const GROUP_FORMS = ['группа', 'группы', 'групп'] as const;
const HERB_FORMS = ['трава', 'травы', 'трав'] as const;

/** Контурная иконка раздела каталога. */
const SECTION_ICONS: Record<CatalogKey, IconName> = {
  indications: 'heart',
  substances: 'flask',
  substanceClasses: 'grid',
  actions: 'leaf',
  organSystems: 'plant',
  months: 'calendar',
  parts: 'flower',
  habitats: 'plant',
  families: 'book',
  lifeForms: 'leaf',
  sourcing: 'bowl',
  safety: 'warning',
};

/** Каталог (макет 04): крупный заголовок с веточкой, поиск и разделы — бумажные строки с иконками. */
export default function CatalogScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const month = new Date().getMonth() + 1;
  const nowCount = useMemo(() => collectNow(bundle, month).length, [bundle, month]);
  const sections = useMemo(
    () =>
      CATALOG_SECTIONS.map((s) => ({ ...s, count: catalogGroups(bundle, s.key).length })).filter((s) => s.count > 0),
    [bundle],
  );

  return (
    <Screen>
      <ScreenTitle title="Каталог" />
      <SearchField placeholder="Поиск трав и свойств…" onPress={() => router.push('/search')} />
      <ListRow
        seed="catalog:now"
        icon="calendar"
        title={`Собирать сейчас · ${monthName(month)}`}
        subtitle={countRu(nowCount, HERB_FORMS)}
        onPress={() => {
          setFilter(filterForGroup('months', String(month)));
          router.push('/herbs');
        }}
      />
      {sections.map((s) => (
        <ListRow
          key={s.key}
          seed={`catalog:${s.key}`}
          icon={SECTION_ICONS[s.key]}
          title={s.title}
          subtitle={countRu(s.count, GROUP_FORMS)}
          onPress={() => router.push({ pathname: '/catalog/[key]', params: { key: s.key } })}
        />
      ))}
    </Screen>
  );
}
