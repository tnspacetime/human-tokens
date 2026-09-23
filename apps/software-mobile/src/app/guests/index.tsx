import { LegendList } from '@legendapp/list/react-native';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaginationFooter } from '@/components/pagination-footer';
import { OfflineReadingState, ReadingState } from '@/components/reading-state';
import { Spacing } from '@/constants/theme';
import { useGuests } from '@/hooks/use-guests';
import { useTheme } from '@/hooks/use-theme';
import type { PublicGuestSummary } from '@/lib/types';

type GuestRowProps = {
  guest: PublicGuestSummary;
  textColor: string;
};

type GuestListHeaderProps = {
  textColor: string;
};

function GuestListHeader({ textColor }: GuestListHeaderProps) {
  return (
    <Text selectable style={[styles.title, { color: textColor }]}>
      Guests
    </Text>
  );
}

function GuestRow({ guest, textColor }: GuestRowProps) {
  return (
    <Link href={{ pathname: '/guests/[id]', params: { id: guest.id } }} asChild>
      <Pressable
        accessibilityHint="Opens the guest page"
        accessibilityRole="link"
        style={({ pressed }) => [styles.guest, pressed && styles.pressed]}>
        <Text selectable style={[styles.guestName, { color: textColor }]}>
          {guest.name}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function GuestsScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const guestsQuery = useGuests();
  const guests = guestsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const stateTopInset = insets.top + Spacing.six + Spacing.five;

  const loadNextPage = () => {
    if (
      guestsQuery.hasNextPage &&
      !guestsQuery.isFetchingNextPage &&
      !guestsQuery.isFetchNextPageError
    ) {
      void guestsQuery.fetchNextPage();
    }
  };

  if (guestsQuery.isPending && !guestsQuery.isPaused) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (guestsQuery.isPaused && !guestsQuery.data) {
    return <OfflineReadingState topInset={stateTopInset} />;
  }

  if (guestsQuery.isError && guests.length === 0) {
    return (
      <ReadingState
        message="There was an error. Tap below to try again."
        onRetry={() => void guestsQuery.refetch()}
        topInset={stateTopInset}
      />
    );
  }

  if (guests.length === 0) {
    return <ReadingState topInset={stateTopInset} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <LegendList
        contentContainerStyle={styles.content}
        data={guests}
        estimatedItemSize={40}
        keyExtractor={(guest) => guest.id}
        ListHeaderComponent={<GuestListHeader textColor={colors.text} />}
        ListFooterComponent={
          <PaginationFooter
            isError={guestsQuery.isFetchNextPageError}
            isFetching={guestsQuery.isFetchingNextPage}
            itemLabel="guests"
            onRetry={() => void guestsQuery.fetchNextPage()}
          />
        }
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => <GuestRow guest={item} textColor={colors.text} />}
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
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 41,
    paddingBottom: Spacing.four,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  guest: {
    paddingVertical: 16,
  },
  guestName: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.35,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.5,
  },
});
