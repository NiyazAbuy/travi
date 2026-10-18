import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import type { IconName } from '@/components';
import { colors } from '@/theme';

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon('leaf') }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог', tabBarIcon: icon('view-grid-outline') }} />
      <Tabs.Screen name="recipes" options={{ title: 'Сборы', tabBarIcon: icon('bowl-mix-outline') }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное', tabBarIcon: icon('heart-outline') }} />
    </Tabs>
  );
}
