import { logStructured } from "../gcp";

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class BaseService {
  protected cache = new Map<string, CacheEntry<any>>();

  /**
   * Safe fetch with retry logic (exponential backoff)
   */
  protected async fetchWithRetry<T = any>(
    url: string,
    options: RequestInit = {},
    retries = 3,
    backoffMs = 1000
  ): Promise<T> {
    let attempt = 0;
    while (attempt < retries) {
      try {
        const response = await fetch(url, {
          ...options,
          // Add standard headers
          headers: {
            "Accept": "application/json",
            "User-Agent": "SmartCityOS/1.0.0",
            ...(options.headers || {}),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText} for URL: ${url}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error: any) {
        attempt++;
        const isLastAttempt = attempt >= retries;
        logStructured(
          isLastAttempt ? "ERROR" : "WARNING",
          `API Call failed (Attempt ${attempt}/${retries}) for URL: ${url}`,
          { error: error.message }
        );

        if (isLastAttempt) {
          throw error;
        }

        // Wait with exponential backoff
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error(`API fetch failed after ${retries} retries`);
  }

  /**
   * Simple key-based cache helper
   */
  protected getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  protected setCached<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Dynamic clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
