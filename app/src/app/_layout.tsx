import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ContentProvider } from '@/content/ContentProvider';
import { colors } from '@/theme';
import { UserDataProvider } from '@/user/UserDataProvider';

export default function RootLayout() {
  return (
    <ContentProvider>
      <UserDataProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </UserDataProvider>
    </ContentProvider>
  );
}
