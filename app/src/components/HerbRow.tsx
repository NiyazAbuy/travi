import { useRouter } from 'expo-router';
import { evidenceRank, type Herb } from '@travy/shared';
import { useContent } from '@/content/ContentProvider';
import { useUserData } from '@/user/UserDataProvider';
import { EvidenceDot } from './EvidenceDot';
import { ListRow } from './ListRow';

export interface HerbRowProps {
  herb: Herb;
  /** Выбранные в фильтре показания: справа точка наименьшего уровня среди них. */
  indications?: readonly string[];
}

/** Строка травы в списках: фото, название, латынь, до двух показаний; долгое нажатие — в избранное. */
export function HerbRow({ herb, indications = [] }: HerbRowProps) {
  const router = useRouter();
  const { nameOf, photoSource } = useContent();
  const { isFavorite, toggleFavorite } = useUserData();
  const photo = herb.photos[0];

  const selected = herb.indications.filter((x) => indications.includes(x.indication));
  const lowest = selected.length
    ? selected.reduce((a, b) => (evidenceRank(b.evidence.level) < evidenceRank(a.evidence.level) ? b : a))
    : undefined;

  const tags = herb.indications.slice(0, 2).map((x) => nameOf('indications', x.indication));
  if (isFavorite(herb.id)) tags.unshift('★ в избранном');

  return (
    <ListRow
      title={herb.name}
      subtitle={herb.latin}
      image={photo ? photoSource(photo.path) : null}
      tags={tags}
      right={lowest ? <EvidenceDot level={lowest.evidence.level} size={12} /> : undefined}
      onPress={() => router.push({ pathname: '/herb/[id]', params: { id: herb.id } })}
      onLongPress={() => toggleFavorite(herb.id)}
    />
  );
}
