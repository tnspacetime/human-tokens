import { useQuery } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';

import { ApiError, getApiUrl } from '@/lib/api';
import type {
  PublicInterviewResponse,
  PublicLatestResponse,
} from '@/lib/types';

export function useLatestContent() {
  return useQuery<PublicLatestResponse>({
    queryKey: ['content', 'latest'],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${getApiUrl()}/api/v1/latest`, { signal });

      if (!response.ok) {
        throw new Error(`Latest content failed with ${response.status}`);
      }

      return (await response.json()) as PublicLatestResponse;
    },
  });
}

export function useInterviewContent(publicId: string) {
  return useQuery<PublicInterviewResponse, ApiError>({
    queryKey: ['content', 'interview', publicId],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${getApiUrl()}/api/v1/interviews/${encodeURIComponent(publicId)}`,
        { signal },
      );

      if (!response.ok) {
        throw new ApiError(`Interview failed with ${response.status}`, response.status);
      }

      return (await response.json()) as PublicInterviewResponse;
    },
    enabled: publicId.length > 0,
    retry: (failureCount, error) => error.status !== 404 && failureCount < 2,
  });
}
