const localProxy = import.meta.env.DEV && import.meta.env.VITE_DEV_API_TARGET?.trim();

export const apiBaseUrl =
  localProxy && typeof window !== 'undefined'
    ? window.location.origin
    : import.meta.env.VITE_API_BASE_URL?.trim() || 'https://api.yucoder.cn';
