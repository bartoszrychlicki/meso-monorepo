import { createBrowserClient } from '@supabase/ssr'

// Custom lock function with real timeout.
// The default @supabase/auth-js navigatorLock waits FOREVER when acquireTimeout > 0,
// which causes auth operations to hang when another tab holds the lock.
function createAcquireTimeoutError(name: string): Error & { isAcquireTimeout: true } {
  const error = new Error(
    `Acquiring an exclusive Navigator LockManager lock "${name}" failed`
  ) as Error & { isAcquireTimeout: true }
  error.isAcquireTimeout = true
  return error
}

function isAbortError(err: unknown): boolean {
  return typeof DOMException !== 'undefined'
    && err instanceof DOMException
    && err.name === 'AbortError'
}

async function lockWithTimeout<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  if (typeof navigator === 'undefined' || !navigator?.locks) {
    return await fn()
  }

  // `0` means "don't wait for the lock" in auth-js (used by auto-refresh ticks).
  if (acquireTimeout === 0) {
    return await navigator.locks.request(
      name,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        if (!lock) {
          throw createAcquireTimeoutError(name)
        }

        return await fn()
      }
    )
  }

  const timeout = acquireTimeout > 0 ? acquireTimeout : 5000
  const ac = new AbortController()
  const LOCK_TIMEOUT = Symbol('supabase-lock-timeout')
  const SKIPPED_AFTER_TIMEOUT = Symbol('supabase-lock-skipped-after-timeout')
  let timer: ReturnType<typeof setTimeout> | undefined
  let timedOut = false

  try {
    const requestPromise = Promise.resolve().then(() => navigator.locks.request(
      name,
      { mode: 'exclusive', signal: ac.signal },
      async () => {
        if (timer) {
          clearTimeout(timer)
        }

        // If we already fell back without the lock, don't execute fn() twice.
        if (timedOut) {
          return SKIPPED_AFTER_TIMEOUT as unknown as R
        }

        return await fn()
      }
    ))

    const timeoutPromise = new Promise<typeof LOCK_TIMEOUT>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true
        ac.abort()
        resolve(LOCK_TIMEOUT)
      }, timeout)
    })

    const result = await Promise.race([requestPromise, timeoutPromise])

    if (result === LOCK_TIMEOUT) {
      // In some Chromium cases the lock request ignores abort while pending.
      // Proceed without the lock and swallow the late abort rejection.
      void requestPromise.catch((err) => {
        if (!isAbortError(err)) {
          console.warn('Supabase auth lock request failed after timeout fallback', err)
        }
      })

      return await fn()
    }

    if (result === SKIPPED_AFTER_TIMEOUT) {
      return await fn()
    }

    return result as R
  } catch (err) {
    if (timer) {
      clearTimeout(timer)
    }

    if (isAbortError(err)) {
      // Lock acquire timed out — proceed without lock to avoid hanging forever
      return await fn()
    }
    throw err
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export function createClient() {
  // Support both variable names for flexibility
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
    {
      auth: {
        lock: lockWithTimeout,
      },
    }
  )
}
