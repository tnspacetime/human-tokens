import { Stack } from 'expo-router/stack';

import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function GuestsLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_left',
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
        headerBlurEffect: 'none',
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerTransparent: true,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/index" options={{ headerTitle: '' }} />
    </Stack>
  );
}
