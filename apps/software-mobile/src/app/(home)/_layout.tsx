import { Stack } from 'expo-router/stack';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function HomeLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBlurEffect: 'none',
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerTransparent: true,
      }}>
      <Stack.Screen name="index" options={{ headerTitle: '' }} />
      <Stack.Screen
        name="announcement"
        options={{
          contentStyle: { backgroundColor: 'transparent' },
          headerShown: Platform.OS === 'ios',
          presentation: 'formSheet',
          sheetCornerRadius: 28,
          sheetGrabberVisible: false,
          title: '',
        }}
      />
      <Stack.Screen
        name="special-items"
        options={{
          contentStyle: { backgroundColor: 'transparent' },
          headerShown: Platform.OS === 'ios',
          presentation: 'formSheet',
          sheetCornerRadius: 28,
          sheetGrabberVisible: false,
          title: '',
        }}
      />
    </Stack>
  );
}
