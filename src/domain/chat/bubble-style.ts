const builtinBubbleIds = [
  'tide-letter',
  'berry-cat-paw',
  'moon-jellyfish',
  'yuzu-capybara',
  'sea-salt-seal',
  'black-sugar-jelly',
] as const;

export interface ChatBubbleArtwork {
  imageUrl: string;
  darkImageUrl?: string;
  textTone: 'theme' | 'light' | 'dark';
}

function httpsImage(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 1024 || !/^https:\/\//i.test(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.hash) return url.href;
  } catch {
    return;
  }
}

export function parseBubbleStyle(id: unknown, value: unknown) {
  if (typeof id !== 'string' || id.length > 32 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id))
    return null;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const data = value as Record<string, unknown>;
    const imageUrl = httpsImage(data.imageUrl);
    const darkImageUrl = httpsImage(data.darkImageUrl);
    if (imageUrl) {
      const artwork: ChatBubbleArtwork = {
        imageUrl,
        ...(darkImageUrl ? { darkImageUrl } : {}),
        textTone: data.textTone === 'light' || data.textTone === 'dark' ? data.textTone : 'theme',
      };
      return { id, artwork };
    }
  }
  return builtinBubbleIds.some((builtin) => builtin === id) ? { id } : null;
}
