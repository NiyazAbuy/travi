import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/user/UserDataProvider';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export const DISCLAIMER_TEXT =
  'Справочник носит информационный характер и не заменяет консультацию врача. ' +
  'Перед применением трав, особенно при беременности, кормлении грудью, у детей и при приёме лекарств, посоветуйтесь с врачом.';

/** Однократный экран-дисклеймер при первом запуске (спецификация §6.2). Ждёт загрузки данных, чтобы не мигать. */
export function DisclaimerGate() {
  const { data, loaded, acceptDisclaimer } = useUserData();
  if (!loaded || data.disclaimerAccepted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xl }}>
        <AppText variant="hero">Травы</AppText>
        <AppText variant="title">Ближе к природе — ближе к себе</AppText>
        <AppText tone="muted">{DISCLAIMER_TEXT}</AppText>
        <Button label="Понятно" onPress={acceptDisclaimer} />
      </SafeAreaView>
    </View>
  );
}
