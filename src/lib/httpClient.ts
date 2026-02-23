import { logger } from "./logger.js";

/**
 * 공통 HTTP JSON 요청 유틸리티
 * - URL 파라미터 조립
 * - 실패 시 지수 백오프 재시도
 */
export async function fetchJson<T = unknown>(
  url: string,
  opts: {
    params?: Record<string, string>;
    retries?: number;
    backoffMs?: number;
  } = {},
): Promise<T> {
  const { params, retries = 3, backoffMs = 1000 } = opts;

  const fullUrl = params
    ? `${url}?${new URLSearchParams(params).toString()}`
    : url;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = backoffMs * 2 ** (attempt - 1);
        logger.warn(`재시도 ${attempt}/${retries} (${delay}ms 대기)`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const res = await fetch(fullUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === retries) break;
    }
  }

  throw lastError!;
}
