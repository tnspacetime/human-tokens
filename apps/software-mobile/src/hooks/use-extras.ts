import { useQuery } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';

import { ApiError, getApiUrl } from '@/lib/api';
import type { ExtrasResponse } from '@/lib/types';

export function useExtras() {
  return useQuery<ExtrasResponse, ApiError>({
    queryKey: ['extras'],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${getApiUrl()}/api/v1/extras`, { signal });

      if (!response.ok) {
        throw new ApiError(`Extras failed with ${response.status}`, response.status);
      }

      return (await response.json()) as ExtrasResponse;
    },
  });
}
