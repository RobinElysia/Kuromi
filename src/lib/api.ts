const configuredApiBaseUrl = String(import.meta.env.VITE_KUROMI_API_BASE_URL ?? "").trim();

export const KUROMI_API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function resolveApiUrl(path: string) {
  const normalizedPath = normalizePath(path);
  return KUROMI_API_BASE_URL ? `${KUROMI_API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export function resolveAssetUrl(path: string) {
  const value = String(path ?? "").trim();
  if (!value) return value;

  try {
    return new URL(value).toString();
  } catch {
    const normalizedPath = normalizePath(value);
    if (!KUROMI_API_BASE_URL) return normalizedPath;

    try {
      return new URL(normalizedPath, KUROMI_API_BASE_URL).toString();
    } catch {
      return normalizedPath;
    }
  }
}
