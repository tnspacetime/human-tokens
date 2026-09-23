const API_URL =
  (__DEV__ ? process.env.EXPO_PUBLIC_LOCAL_API_URL : undefined) ??
  process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiUrl() {
  if (!API_URL) {
    throw new Error('Missing content API URL');
  }

  return API_URL.replace(/\/$/, '');
}

export function getApiResourceUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${getApiUrl()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
