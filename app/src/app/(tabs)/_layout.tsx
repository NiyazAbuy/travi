import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, PaperTexture, type IconName } from '@/components';
import { colors, spacing, typography } from '@/theme';

/** Сторона иконки вкладки, px. */
const TAB_ICON = 24;
/** Высота панели без системного отступа снизу: иконка, подпись засечным шрифтом (он выше стандартного) и поля. */
const TAB_BAR_HEIGHT = TAB_ICON + typography.tab.lineHeight + spacing.sm * 2 + spacing.xs;

/** Иконка вкладки: тонкий контур; у активной — чуть плотнее и цветом мха. */
const icon =
  (name: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean; size: number }) => (
    <Icon
      name={name}
      size={TAB_ICON}
      color={typeof color === 'string' ? color : colors.textMuted}
      weight={focused ? 'regular' : 'light'}
    />
  );

/** Панель вкладок на бумаге — того же цвета и с тем же зерном, что экраны. */
function TabBarPaper() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PaperTexture />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          backgroundColor: colors.background,
          borderTopColor: colors.divider,
        },
        tabBarBackground: TabBarPaper,
        tabBarActiveTintColor: colors.moss,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: typography.tab,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог', tabBarIcon: icon('book') }} />
      <Tabs.Screen name="recipes" options={{ title: 'Сборы', tabBarIcon: icon('bowl') }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное', tabBarIcon: icon('heart') }} />
    </Tabs>
  );
}
