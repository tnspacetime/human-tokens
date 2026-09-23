import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  defaultShouldDehydrateQuery,
  focusManager,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import { type PropsWithChildren, useEffect } from 'react';
import { AppState, Platform } from 'react-native';

const QUERY_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CACHE_MAX_AGE,
      retry: 2,
      staleTime: 30 * 60 * 1000,
    },
  },
});

const queryPersister = createAsyncStoragePersister({
  key: 'human-tokens-query-cache',
  storage: AsyncStorage,
});

if (process.env.EXPO_OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    let initialized = false;

    const subscription = Network.addNetworkStateListener((state) => {
      initialized = true;
      setOnline(Boolean(state.isConnected));
    });

    void Network.getNetworkStateAsync()
      .then((state) => {
        if (!initialized) {
          setOnline(Boolean(state.isConnected));
        }
      })
      .catch(() => undefined);

    return () => subscription.remove();
  });
}

export function AppQueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        buster: 'v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) || query.state.data !== undefined,
        },
        maxAge: QUERY_CACHE_MAX_AGE,
        persister: queryPersister,
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
