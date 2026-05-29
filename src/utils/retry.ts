/**
 * Simple fetch wrapper with retry and exponential backoff.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  delay: number = 500
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (!res.ok && attempt < retries) {
        // Only retry on server errors or rate limits
        if (res.status >= 500 || res.status === 429) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res; // Don't retry client errors
      }

      return res;
    } catch (err) {
      lastError = err as Error;

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}
