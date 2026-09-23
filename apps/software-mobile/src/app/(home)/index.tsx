import { useMemo } from 'react';
import ListAlt from '@expo/material-symbols/list_alt.xml';
import Newspaper from '@expo/material-symbols/newspaper.xml';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';

import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Fonts } from '@/constants/theme';
import { useLatestContent } from '@/hooks/use-content';
import { useTheme } from '@/hooks/use-theme';
import { formatPublicationDate } from '@/lib/format-publication-date';
import { getApiResourceUrl } from '@/lib/api';
import {
  createBackgroundMarkdownStyle,
  createInterviewMarkdownStyle,
} from '@/lib/markdown-styles';

export default function HomeScreen() {
  const colors = useTheme();
  const headerHeight = useHeaderHeight();
  const latestContent = useLatestContent();
  const content = latestContent.data?.item;
  const backgroundMarkdownStyle = useMemo(() => createBackgroundMarkdownStyle(colors), [colors]);
  const interviewMarkdownStyle = useMemo(() => createInterviewMarkdownStyle(colors), [colors]);

  let body;

  if (latestContent.isPending && !latestContent.isPaused) {
    body = (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (latestContent.isPaused && !latestContent.data) {
    body = <OfflineReadingState topInset={headerHeight + 48} />;
  } else if (latestContent.isLoadingError) {
    body = (
      <ReadingState
        message="There was an error. Tap below to try again."
        onRetry={() => void latestContent.refetch()}
        topInset={headerHeight + 48}
      />
    );
  } else if (!content) {
    body = (
      <ReadingState
        message="Check back soon for a new reading."
        topInset={headerHeight + 48}
      />
    );
  } else {
    body = (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}>
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <View style={styles.contentColumn}>
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
            <Text selectable style={[styles.authorName, { color: colors.accent }]}>
              {content.guest.name}
            </Text>
            <Text selectable style={[styles.kicker, { color: colors.textSecondary }]}>
              INTERVIEW
            </Text>
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
                markdownStyle={interviewMarkdownStyle}
                selectable
              />
            </View>

            <View style={styles.interviewBody}>
              <EnrichedMarkdownText
                flavor="github"
                markdown={content.interview.contentMarkdown}
                markdownStyle={interviewMarkdownStyle}
                selectable
              />
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.lastSection, { backgroundColor: colors.background }]}>
          <View style={styles.contentColumn}>
            <Text selectable style={[styles.kicker, { color: colors.textSecondary }]}>
              AFTER THE INTERVIEW
            </Text>
            <Text selectable style={[styles.title, { color: colors.text }]}>
              {content.backgroundReading.title}
            </Text>
            <View style={styles.backgroundIntroduction}>
              <EnrichedMarkdownText
                flavor="github"
                markdown={content.backgroundReading.summary}
                markdownStyle={backgroundMarkdownStyle}
                selectable
              />
            </View>

            <View style={styles.readingList}>
              <EnrichedMarkdownText
                flavor="github"
                markdown={content.backgroundReading.contentMarkdown}
                markdownStyle={backgroundMarkdownStyle}
                selectable
              />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      {body}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Open announcement"
          icon={process.env.EXPO_OS === 'android' ? Newspaper : 'newspaper'}
          onPress={() => router.push('/announcement')}
        />
        <Stack.Toolbar.Button
          accessibilityLabel="Open special items"
          icon={process.env.EXPO_OS === 'android' ? ListAlt : 'list.bullet.clipboard'}
          onPress={() => router.push('/special-items')}
        />
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    flex: 1,
    gap: 20,
    justifyContent: 'center',
    padding: 24,
  },
  section: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  lastSection: {
    paddingBottom: 120,
  },
  contentColumn: {
    alignSelf: 'center',
    maxWidth: 672,
    width: '100%',
  },
  portrait: {
    aspectRatio: 1,
    borderCurve: 'continuous',
    borderRadius: 24,
    width: 152,
  },
  authorName: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '400',
    paddingBottom: 32,
    paddingTop: 12,
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
    paddingTop: 8,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -2.2,
    lineHeight: 44,
    maxWidth: 560,
    paddingTop: 28,
  },
  introduction: {
    maxWidth: 640,
    paddingTop: 20,
  },
  backgroundIntroduction: {
    maxWidth: 600,
    paddingTop: 20,
  },
  interviewBody: {
    paddingTop: 64,
  },
  readingList: {
    paddingTop: 12,
  },
});
