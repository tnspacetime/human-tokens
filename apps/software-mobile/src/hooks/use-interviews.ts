import { useInfiniteQuery } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';

import { ApiError, getApiUrl } from '@/lib/api';
import type { PublicInterviewsResponse } from '@/lib/types';

const INTERVIEWS_PAGE_SIZE = 20;

export function useInterviews() {
  return useInfiniteQuery({
    queryKey: ['interviews', 'list', { pageSize: INTERVIEWS_PAGE_SIZE }],
    queryFn: async ({ pageParam, signal }): Promise<PublicInterviewsResponse> => {
      const cursorQuery = pageParam
        ? `&cursor=${encodeURIComponent(pageParam)}`
        : '';
      const response = await fetch(
        `${getApiUrl()}/api/v1/interviews?limit=${INTERVIEWS_PAGE_SIZE}${cursorQuery}`,
        { signal },
      );

      if (!response.ok) {
        throw new ApiError(`Interviews failed with ${response.status}`, response.status);
      }

      return (await response.json()) as PublicInterviewsResponse;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
