import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DisclaimerGate } from '@/components';
import { ContentProvider } from '@/content/ContentProvider';
import { ListFilterProvider } from '@/state/ListFilterProvider';
import { colors } from '@/theme';
import { UserDataProvider } from '@/user/UserDataProvider';

export default function RootLayout() {
  return (
    <ContentProvider>
      <UserDataProvider>
        <ListFilterProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="herbs" options={{ title: 'Травы' }} />
            <Stack.Screen name="filters" options={{ title: 'Фильтры', presentation: 'modal' }} />
            <Stack.Screen name="herb/[id]" options={{ title: '' }} />
            <Stack.Screen name="recipe/[id]" options={{ title: '' }} />
            <Stack.Screen name="catalog/[key]" options={{ title: 'Каталог' }} />
            <Stack.Screen name="search" options={{ title: 'Поиск' }} />
            <Stack.Screen name="settings" options={{ title: 'О приложении' }} />
          </Stack>
          <DisclaimerGate />
        </ListFilterProvider>
      </UserDataProvider>
    </ContentProvider>
  );
}
