import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, PaperTexture, type IconName } from '@/components';
import { colors, radius, tabBar, typography } from '@/theme';

/** Иконка вкладки: тонкий контур; у активной — плотнее, цветом мха и на светлой «подложке», чтобы её было видно сразу. */
const icon =
  (name: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean; size: number }) => (
    <View
      style={{
        paddingHorizontal: tabBar.pillPadding,
        paddingVertical: tabBar.pillPadding / 4,
        borderRadius: radius.pill,
        backgroundColor: focused ? colors.paperDeep : 'transparent',
      }}
    >
      <Icon
        name={name}
        size={tabBar.icon}
        color={typeof color === 'string' ? color : colors.textMuted}
        weight={focused ? 'regular' : 'light'}
      />
    </View>
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
          height: tabBar.height + insets.bottom,
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
