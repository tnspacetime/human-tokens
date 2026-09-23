import { Link, Stack, type Href, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Fonts, type Theme } from '@/constants/theme';
import { useExtras } from '@/hooks/use-extras';
import { useTheme } from '@/hooks/use-theme';
import { formatPublicationDate } from '@/lib/format-publication-date';
import type { SpecialItem } from '@/lib/types';

function getExternalHref(item: SpecialItem): Href | null {
  if (item.kind !== 'link' || !item.url) {
    return null;
  }

  try {
    const url = new URL(item.url);

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? (item.url as Href)
      : null;
  } catch {
    return null;
  }
}

function SpecialItemRow({ item, colors }: { item: SpecialItem; colors: Theme }) {
  const href = getExternalHref(item);
  const content = (
    <>
      <Text selectable style={[styles.title, { color: colors.text }]}>
        {item.title}
      </Text>
      <Text selectable style={[styles.date, { color: colors.textSecondary }]}>
        {formatPublicationDate(item.publishedAt.slice(0, 10))}
      </Text>
      <Text selectable style={[styles.body, { color: colors.text }]}>
        {item.body}
      </Text>
      {href ? (
        <Text style={[styles.linkAction, { color: colors.accent }]}>Open link ↗</Text>
      ) : null}
    </>
  );

  if (!href) {
    return <View style={styles.item}>{content}</View>;
  }

  return (
    <Link asChild href={href} rel="noopener noreferrer" target="_blank">
      <Pressable
        accessibilityHint="Opens in your browser"
        accessibilityRole="link"
        style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : undefined]}>
        {content}
      </Pressable>
    </Link>
  );
}

export default function SpecialItemsSheet() {
  const colors = useTheme();
  const extras = useExtras();
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const specialItems = extras.data?.specialItems;
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
  } else if (!specialItems?.length) {
    body = (
      <ReadingState
        message="Check back soon for something special."
        topInset={stateTopInset}
      />
    );
  } else {
    body = (
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          Platform.OS === 'android' ? styles.androidContent : undefined,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        data={specialItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SpecialItemRow colors={colors} item={item} />}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Close special items"
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
              accessibilityLabel="Close special items"
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
  listContent: {
    gap: 28,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  item: {
    gap: 8,
  },
  itemPressed: {
    opacity: 0.65,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  date: {
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    lineHeight: 25,
  },
  linkAction: {
    alignSelf: 'flex-start',
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
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
