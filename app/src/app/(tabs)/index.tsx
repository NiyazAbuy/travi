import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Chip, EvidenceDot, ListRow, Screen, SearchField, SectionHeader } from '@/components';
import { spacing } from '@/theme';

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(false);
  return (
    <Screen>
      <AppText variant="hero">Травы</AppText>
      <AppText tone="muted">Знания о травах. Гармония с природой.</AppText>
      <SearchField value={query} onChangeText={setQuery} />
      <SectionHeader title="Компоненты" actionLabel="Все" onAction={() => setSelected(!selected)} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Chip label="все" selected />
        <Chip label="сон" selected={selected} onPress={() => setSelected(!selected)} />
        <Chip label="дыхание" />
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <EvidenceDot level="proven" />
          <EvidenceDot level="traditional" />
          <EvidenceDot level="folk" />
          <EvidenceDot level="refuted" />
        </View>
        <ListRow title="Ромашка аптечная" subtitle="Matricaria chamomilla" tags={['спокойствие']} onPress={() => {}} />
      </Card>
      <Button label="Добавить в избранное" onPress={() => {}} />
    </Screen>
  );
}
