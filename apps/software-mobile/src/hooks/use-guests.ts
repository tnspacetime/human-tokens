import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';

import { ApiError, getApiUrl } from '@/lib/api';
import type { PublicGuestResponse, PublicGuestsResponse } from '@/lib/types';

const GUESTS_PAGE_SIZE = 100;

export function useGuests() {
  return useInfiniteQuery({
    queryKey: ['guests', 'list', { pageSize: GUESTS_PAGE_SIZE }],
    queryFn: async ({ pageParam, signal }): Promise<PublicGuestsResponse> => {
      const cursorQuery = pageParam
        ? `&cursor=${encodeURIComponent(pageParam)}`
        : '';
      const response = await fetch(
        `${getApiUrl()}/api/v1/guests?limit=${GUESTS_PAGE_SIZE}${cursorQuery}`,
        { signal },
      );

      if (!response.ok) {
        throw new ApiError(`Guests failed with ${response.status}`, response.status);
      }

      return (await response.json()) as PublicGuestsResponse;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useGuest(guestId: string) {
  return useQuery<PublicGuestResponse, ApiError>({
    queryKey: ['guests', 'detail', guestId],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${getApiUrl()}/api/v1/guests/${encodeURIComponent(guestId)}`,
        { signal },
      );

      if (!response.ok) {
        throw new ApiError(`Guest failed with ${response.status}`, response.status);
      }

      return (await response.json()) as PublicGuestResponse;
    },
    enabled: guestId.length > 0,
    retry: (failureCount, error) => error.status !== 404 && failureCount < 2,
  });
}
