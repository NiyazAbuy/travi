import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { DisclaimerGate, PaperTexture } from '@/components';
import { ContentProvider } from '@/content/ContentProvider';
import { ListFilterProvider } from '@/state/ListFilterProvider';
import { colors, typography } from '@/theme';
import { useThemeFonts } from '@/theme/fonts';
import { UpdateProvider } from '@/update/UpdateProvider';
import { UserDataProvider } from '@/user/UserDataProvider';

// Сплэш держится, пока не готовы шрифты: без мигания системного шрифта при запуске.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Шапка экранов стека — та же бумага, что под ней. */
function HeaderPaper() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PaperTexture />
    </View>
  );
}

export default function RootLayout() {
  // Шрифты загрузились, не загрузились или не успели — в любом случае дальше (тогда текст системным шрифтом).
  const fontsReady = useThemeFonts();

  useEffect(() => {
    if (fontsReady) SplashScreen.hide();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <ContentProvider>
      <UpdateProvider>
        <UserDataProvider>
          <ListFilterProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerBackground: HeaderPaper,
                headerTintColor: colors.text,
                headerTitleStyle: { fontFamily: typography.header.fontFamily, fontSize: typography.header.fontSize, color: colors.text },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="herbs" options={{ title: 'Травы' }} />
              {/* карточка травы рисует свою шапку — круглые кнопки «назад» и «в избранное» (макет 03) */}
              <Stack.Screen name="herb/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="herb/[id]/details" options={{ title: 'Подробнее о траве' }} />
              <Stack.Screen name="recipe/[id]" options={{ title: '' }} />
              <Stack.Screen name="catalog/[key]" options={{ title: 'Каталог' }} />
              <Stack.Screen name="search" options={{ title: 'Поиск' }} />
              <Stack.Screen name="settings" options={{ title: 'О приложении' }} />
            </Stack>
            <DisclaimerGate />
          </ListFilterProvider>
        </UserDataProvider>
      </UpdateProvider>
    </ContentProvider>
  );
}
