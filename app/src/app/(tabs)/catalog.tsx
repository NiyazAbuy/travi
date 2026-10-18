import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { CATALOG_SECTIONS, catalogGroups, collectNow, countRu, filterForGroup, monthName } from '@travy/shared';
import { AppText, ListRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';

const GROUP_FORMS = ['группа', 'группы', 'групп'] as const;
const HERB_FORMS = ['трава', 'травы', 'трав'] as const;

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
      <AppText variant="title">Каталог</AppText>
      <ListRow
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
          title={s.title}
          subtitle={countRu(s.count, GROUP_FORMS)}
          onPress={() => router.push({ pathname: '/catalog/[key]', params: { key: s.key } })}
        />
      ))}
    </Screen>
  );
}
