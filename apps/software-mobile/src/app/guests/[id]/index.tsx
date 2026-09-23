import { Link, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Fonts } from '@/constants/theme';
import { useGuest } from '@/hooks/use-guests';
import { useTheme } from '@/hooks/use-theme';
import { formatPublicationDate } from '@/lib/format-publication-date';

export default function GuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const headerHeight = useHeaderHeight();
  const guestQuery = useGuest(id ?? '');
  const guest = guestQuery.data?.item;

  if (guestQuery.isPending && !guestQuery.isPaused) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (guestQuery.isPaused && !guestQuery.data) {
    return <OfflineReadingState topInset={headerHeight + 48} />;
  }

  if (guestQuery.isLoadingError) {
    const isNotFound = guestQuery.error.status === 404;

    return isNotFound ? (
      <ReadingState
        message="This guest could not be found."
        topInset={headerHeight + 48}
      />
    ) : (
      <ReadingState
        message="There was an error. Tap below to try again."
        onRetry={() => void guestQuery.refetch()}
        topInset={headerHeight + 48}
      />
    );
  }

  if (!guest) {
    return (
      <ReadingState
        message="This guest could not be found."
        topInset={headerHeight + 48}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        process.env.EXPO_OS === 'android'
          ? { paddingTop: headerHeight + 48 }
          : undefined,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}>
      <View style={styles.content}>
        <Text selectable style={[styles.guestName, { color: colors.text }]}>
          {guest.name}
        </Text>

        <Text selectable style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          INTERVIEWS
        </Text>
        <View style={styles.interviewList}>
          {guest.interviews.length > 0 ? (
            guest.interviews.map((interview) => (
              <View key={interview.publicId} style={styles.interview}>
                <Link
                  href={{
                    pathname: '/interviews/[id]',
                    params: { id: interview.publicId },
                  }}
                  asChild>
                  <Pressable
                    accessibilityHint="Opens the full interview"
                    accessibilityRole="link"
                    style={({ pressed }) => pressed && styles.pressed}>
                    <Text selectable style={[styles.interviewTitle, { color: colors.text }]}>
                      {interview.title}
                    </Text>
                  </Pressable>
                </Link>

                <View style={styles.metadata}>
                  <Text selectable style={[styles.date, { color: colors.textSecondary }]}>
                    {formatPublicationDate(interview.publicationDate)}
                  </Text>
                  <Link
                    href={{
                      pathname: '/interviews/[id]/background-reading',
                      params: { id: interview.publicId },
                    }}
                    asChild>
                    <Pressable
                      accessibilityHint="Opens the technical background reading"
                      accessibilityRole="link"
                      hitSlop={8}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <Text style={[styles.readingLink, { color: colors.textSecondary }]}>
                        Background reading
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            ))
          ) : (
            <Text selectable style={[styles.emptyText, { color: colors.textSecondary }]}>
              No interviews have been published yet.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 120,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  content: {
    maxWidth: 672,
    width: '100%',
  },
  guestName: {
    fontFamily: Fonts.sans,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.8,
    lineHeight: 44,
  },
  sectionTitle: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    paddingTop: 56,
  },
  interviewList: {
    paddingTop: 12,
  },
  interview: {
    gap: 8,
    paddingVertical: 16,
  },
  interviewTitle: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.35,
    lineHeight: 26,
  },
  date: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
  },
  metadata: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  readingLink: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 16,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
