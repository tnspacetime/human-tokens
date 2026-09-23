import { useMemo } from 'react';
import { Image } from 'expo-image';
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
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';

import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Fonts } from '@/constants/theme';
import { useInterviewContent } from '@/hooks/use-content';
import { useTheme } from '@/hooks/use-theme';
import { formatPublicationDate } from '@/lib/format-publication-date';
import { getApiResourceUrl } from '@/lib/api';
import { createInterviewMarkdownStyle } from '@/lib/markdown-styles';

export default function InterviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const headerHeight = useHeaderHeight();
  const markdownStyle = useMemo(() => createInterviewMarkdownStyle(colors), [colors]);
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
        message="This interview could not be found."
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
        message="This interview could not be found."
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
        {content.interview.portraitUrl ? (
          <Image
            accessibilityLabel={`${content.guest.name} portrait`}
            contentFit="cover"
            source={getApiResourceUrl(content.interview.portraitUrl)}
            style={styles.portrait}
          />
        ) : (
          <View
            accessibilityLabel={`${content.guest.name} portrait placeholder`}
            accessible
            style={[styles.portrait, { backgroundColor: colors.accent }]}
          />
        )}
        <Link
          href={{
            pathname: '/guests/[id]',
            params: { id: content.guest.id },
          }}
          asChild>
          <Pressable
            accessibilityHint="Opens the guest page"
            accessibilityRole="link"
            style={({ pressed }) => pressed && styles.pressed}>
            <Text selectable style={[styles.guestName, { color: colors.accent }]}>
              {content.guest.name}
            </Text>
          </Pressable>
        </Link>
        <Text selectable style={[styles.kicker, { color: colors.textSecondary }]}>INTERVIEW</Text>
        <Text selectable style={[styles.date, { color: colors.textSecondary }]}>
          {formatPublicationDate(content.publicationDate)}
        </Text>
        <Text selectable style={[styles.title, { color: colors.text }]}>
          {content.interview.title}
        </Text>
        <View style={styles.introduction}>
          <EnrichedMarkdownText
            flavor="github"
            markdown={content.interview.summary}
            markdownStyle={markdownStyle}
            selectable
          />
        </View>

        <View style={styles.body}>
          <EnrichedMarkdownText
            flavor="github"
            markdown={content.interview.contentMarkdown}
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
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 48,
  },
  article: {
    maxWidth: 672,
    width: '100%',
  },
  portrait: {
    aspectRatio: 1,
    borderCurve: 'continuous',
    borderRadius: 24,
    width: 152,
  },
  guestName: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '400',
    paddingBottom: 32,
    paddingTop: 12,
  },
  pressed: {
    opacity: 0.5,
  },
  kicker: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  date: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '400',
    paddingTop: 8,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.8,
    lineHeight: 44,
    maxWidth: 600,
    paddingTop: 28,
  },
  introduction: {
    maxWidth: 620,
    paddingTop: 20,
  },
  body: {
    paddingTop: 44,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
