import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ReadingStateProps = {
  message?: string;
  onRetry?: () => void;
  topInset?: number;
};

type OfflineReadingStateProps = Pick<ReadingStateProps, 'topInset'>;

export function OfflineReadingState({ topInset }: OfflineReadingStateProps) {
  return (
    <ReadingState
      message="You're offline. Reconnect to load this content."
      topInset={topInset}
    />
  );
}

export function ReadingState({ message, onRetry, topInset }: ReadingStateProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const resolvedTopInset = topInset ?? insets.top + 48;

  return (
    <View
      style={[
        styles.state,
        { backgroundColor: colors.background },
        { paddingTop: resolvedTopInset },
      ]}>
      <Image
        accessibilityLabel="Software Tokens"
        source={require('@/assets/images/icon.png')}
        style={styles.symbol}
      />
      <View style={styles.copy}>
        <Text selectable style={[styles.title, { color: colors.text }]}>
          One meaningful reading at a time.
        </Text>
        {message ? (
          <Text selectable style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>
        ) : null}
      </View>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: colors.accent },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.retryText, { color: colors.background }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    flex: 1,
    gap: 20,
    padding: 24,
  },
  symbol: {
    borderCurve: 'continuous',
    borderRadius: 22,
    height: 96,
    width: 96,
  },
  copy: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 320,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 25,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 31,
    textAlign: 'center',
  },
  message: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryButton: {
    borderCurve: 'continuous',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.5,
  },
});
