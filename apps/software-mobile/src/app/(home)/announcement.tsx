import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Fonts } from '@/constants/theme';
import { useExtras } from '@/hooks/use-extras';
import { useTheme } from '@/hooks/use-theme';
import { formatPublicationDate } from '@/lib/format-publication-date';

export default function AnnouncementSheet() {
  const colors = useTheme();
  const extras = useExtras();
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const announcement = extras.data?.announcement;
  const stateTopInset = (Platform.OS === 'ios' ? headerHeight : 60) + 48;

  const closeSheet = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  let body;

  if (extras.isPending && !extras.isPaused) {
    body = (
      <View style={styles.state}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (extras.isPaused && !extras.data) {
    body = <OfflineReadingState topInset={stateTopInset} />;
  } else if (extras.isLoadingError) {
    body = (
      <ReadingState
        message="There was an error. Tap below to try again."
        onRetry={() => void extras.refetch()}
        topInset={stateTopInset}
      />
    );
  } else if (!announcement) {
    body = (
      <ReadingState
        message="Check back soon for an announcement."
        topInset={stateTopInset}
      />
    );
  } else {
    body = (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.readingContent,
          Platform.OS === 'android' ? styles.androidContent : undefined,
        ]}>
        <Text selectable style={[styles.title, { color: colors.text }]}>
          {announcement.title}
        </Text>
        <Text selectable style={[styles.date, { color: colors.textSecondary }]}>
          {formatPublicationDate(announcement.publishedAt.slice(0, 10))}
        </Text>
        <Text selectable style={[styles.body, { color: colors.text }]}>
          {announcement.body}
        </Text>
      </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Close announcement"
              accessibilityRole="button"
              hitSlop={8}
              onPress={closeSheet}
              style={styles.headerButton}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close' }}
                size={18}
                tintColor={colors.text}
                type="monochrome"
              />
            </Pressable>
          ),
          headerShadowVisible: false,
          headerShown: Platform.OS === 'ios',
          headerStyle:
            Platform.OS === 'ios'
              ? { backgroundColor: 'transparent' }
              : undefined,
          headerTintColor: colors.text,
          headerTransparent: Platform.OS === 'ios',
          title: '',
        }}
      />
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={[styles.screen, { backgroundColor: colors.background }]}>
        {Platform.OS === 'android' ? (
          <View style={styles.androidCloseRow}>
            <Pressable
              accessibilityLabel="Close announcement"
              accessibilityRole="button"
              hitSlop={8}
              onPress={closeSheet}
              style={[
                styles.androidCloseButton,
                { backgroundColor: colors.backgroundElement },
              ]}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close' }}
                size={18}
                tintColor={colors.text}
                type="monochrome"
              />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.content}>{body}</View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  androidCloseButton: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  androidCloseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  androidContent: {
    paddingTop: 76,
  },
  content: {
    flex: 1,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  readingContent: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 39,
  },
  date: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    paddingTop: 10,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    lineHeight: 27,
    paddingTop: 28,
  },
  headerButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  screen: {
    flex: 1,
  },
});
