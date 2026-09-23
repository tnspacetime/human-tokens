import { LegendList } from '@legendapp/list/react-native';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaginationFooter } from '@/components/pagination-footer';
import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Spacing, type Theme } from '@/constants/theme';
import { useInterviews } from '@/hooks/use-interviews';
import { useTheme } from '@/hooks/use-theme';
import { formatPublicationDate } from '@/lib/format-publication-date';
import type { PublicInterviewSummary } from '@/lib/types';

type InterviewRowProps = {
  colors: Theme;
  interview: PublicInterviewSummary;
};

type InterviewListHeaderProps = {
  colors: Theme;
};

function InterviewListHeader({ colors }: InterviewListHeaderProps) {
  return (
    <View style={styles.header}>
      <Text selectable style={[styles.title, { color: colors.text }]}>
        One conversation at a time.
      </Text>
      <Text selectable style={[styles.subtitle, { color: colors.textSecondary }]}>
        Pure human tokens: developers in their own words, authentic and unprompted.
      </Text>
    </View>
  );
}

function InterviewRow({ colors, interview }: InterviewRowProps) {
  return (
    <View style={styles.row}>
      <Link
        href={{ pathname: '/interviews/[id]', params: { id: interview.publicId } }}
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
  );
}

export default function InterviewsScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const interviewsQuery = useInterviews();
  const interviews = interviewsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const stateTopInset = insets.top + Spacing.six + Spacing.five;

  const loadNextPage = () => {
    if (
      interviewsQuery.hasNextPage &&
      !interviewsQuery.isFetchingNextPage &&
      !interviewsQuery.isFetchNextPageError
    ) {
      void interviewsQuery.fetchNextPage();
    }
  };

  if (interviewsQuery.isPending && !interviewsQuery.isPaused) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (interviewsQuery.isPaused && !interviewsQuery.data) {
    return <OfflineReadingState topInset={stateTopInset} />;
  }

  if (interviewsQuery.isError && interviews.length === 0) {
    return (
      <ReadingState
        message="There was an error. Tap below to try again."
        onRetry={() => void interviewsQuery.refetch()}
        topInset={stateTopInset}
      />
    );
  }

  if (interviews.length === 0) {
    return <ReadingState topInset={stateTopInset} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <LegendList
        contentContainerStyle={styles.content}
        data={interviews}
        estimatedItemSize={88}
        keyExtractor={(interview) => interview.publicId}
        ListHeaderComponent={<InterviewListHeader colors={colors} />}
        ListFooterComponent={
          <PaginationFooter
            isError={interviewsQuery.isFetchNextPageError}
            isFetching={interviewsQuery.isFetchingNextPage}
            itemLabel="interviews"
            onRetry={() => void interviewsQuery.fetchNextPage()}
          />
        }
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => <InterviewRow colors={colors} interview={item} />}
        recycleItems
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
  },
  header: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 41,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  row: {
    gap: 10,
    paddingVertical: 16,
  },
  pressed: {
    opacity: 0.5,
  },
  interviewTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.35,
    lineHeight: 26,
  },
  date: {
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
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
  },
});
