import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';

import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Fonts } from '@/constants/theme';
import { useInterviewContent } from '@/hooks/use-content';
import { useTheme } from '@/hooks/use-theme';
import { createBackgroundMarkdownStyle } from '@/lib/markdown-styles';

export default function BackgroundReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const headerHeight = useHeaderHeight();
  const markdownStyle = useMemo(() => createBackgroundMarkdownStyle(colors), [colors]);
  const interviewQuery = useInterviewContent(id ?? '');
  const content = interviewQuery.data?.item;

  if (interviewQuery.isPending && !interviewQuery.isPaused) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (interviewQuery.isPaused && !interviewQuery.data) {
    return <OfflineReadingState topInset={headerHeight + 48} />;
  }

  if (interviewQuery.isLoadingError) {
    return interviewQuery.error.status === 404 ? (
      <ReadingState
        message="This background reading could not be found."
        topInset={headerHeight + 48}
      />
    ) : (
      <ReadingState
        message="There was an error. Tap below to try again."
        onRetry={() => void interviewQuery.refetch()}
        topInset={headerHeight + 48}
      />
    );
  }

  if (!content) {
    return (
      <ReadingState
        message="This background reading could not be found."
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
      <View style={styles.article}>
        <Text selectable style={[styles.kicker, { color: colors.textSecondary }]}>
          BACKGROUND READING
        </Text>
        <Text selectable style={[styles.interviewTitle, { color: colors.textSecondary }]}>
          {content.interview.title}
        </Text>
        <Text selectable style={[styles.title, { color: colors.text }]}>
          {content.backgroundReading.title}
        </Text>
        <View style={styles.summary}>
          <EnrichedMarkdownText
            flavor="github"
            markdown={content.backgroundReading.summary}
            markdownStyle={markdownStyle}
            selectable
          />
        </View>

        <View style={styles.readingBody}>
          <EnrichedMarkdownText
            flavor="github"
            markdown={content.backgroundReading.contentMarkdown}
            markdownStyle={markdownStyle}
            selectable
          />
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
  article: {
    maxWidth: 672,
    width: '100%',
  },
  kicker: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  interviewTitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
    maxWidth: 560,
    paddingTop: 10,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.8,
    lineHeight: 44,
    paddingTop: 28,
  },
  summary: {
    maxWidth: 600,
    paddingTop: 20,
  },
  readingBody: {
    paddingTop: 40,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
