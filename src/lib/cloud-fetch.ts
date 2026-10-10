const RETRYABLE =
  /failed to fetch|load failed|networkerror|network error|aborted|timeout|econnreset|err_network/i

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** 弱网 / 微信内置浏览器下 Supabase 请求易失败，自动重试几次 */
export async function cloudFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(input, init)
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      if (attempt >= 2 || !RETRYABLE.test(msg)) throw err
      await sleep(600 * (attempt + 1))
    }
  }
  throw lastErr
}
