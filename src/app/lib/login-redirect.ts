export function safeLoginRedirect(value: string | null): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  )
    return '/';
  try {
    const url = new URL(value, 'https://fish-island.invalid');
    if (
      url.origin !== 'https://fish-island.invalid' ||
      /^\/(?:user\/login|login)(?:\/|$)/.test(url.pathname)
    )
      return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
