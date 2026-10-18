import { Tabs } from 'expo-router';
import { colors } from '@/theme';

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
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Сборы' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное' }} />
    </Tabs>
  );
}
