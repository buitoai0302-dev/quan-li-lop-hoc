export function getZaloUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\+?[0-9\s.-]{9,20}$/.test(trimmed)) {
    return `https://zalo.me/${trimmed.replace(/\D/g, '')}`;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' && url.hostname === 'zalo.me' ? url.href : null;
  } catch {
    return null;
  }
}
