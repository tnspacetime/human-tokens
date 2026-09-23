import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PaginationFooterProps = {
  isError: boolean;
  isFetching: boolean;
  itemLabel: string;
  onRetry: () => void;
};

export function PaginationFooter({
  isError,
  isFetching,
  itemLabel,
  onRetry,
}: PaginationFooterProps) {
  const colors = useTheme();

  if (isFetching) {
    return <ActivityIndicator color={colors.accent} style={styles.footer} />;
  }

  if (!isError) {
    return null;
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.footer}>
      <Text selectable style={[styles.message, { color: colors.textSecondary }]}>
        Couldn&apos;t load more {itemLabel}.
      </Text>
      <Pressable
        accessibilityHint={`Retries loading more ${itemLabel}`}
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.retryText, { color: colors.background }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
  message: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.5,
  },
});
