import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Сборы' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное' }} />
    </Tabs>
  );
}
