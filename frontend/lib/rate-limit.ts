"use server"

/**
 * Simple in-memory rate limiter for API routes.
 * Cleans up expired entries automatically.
 *
 * Usage in an API route:
 *   const limit = await rateLimit(request.ip ?? "anonymous", 10, 60)
 *   if (!limit.success) return new Response("Too many requests", { status: 429 })
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const cache = new Map<string, RateLimitEntry>()

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function cleanup() {
  const now = nowSeconds()
  for (const [key, entry] of cache) {
    if (entry.resetAt < now) {
      cache.delete(key)
    }
  }
}

/**
 * Check rate limit for an identifier (IP, userId, etc.)
 * @param identifier — unique key (IP address, API key, etc.)
 * @param maxRequests — max requests allowed in the window
 * @param windowSeconds — time window in seconds
 */
export async function rateLimit(
  identifier: string,
  maxRequests = 10,
  windowSeconds = 60
): Promise<{ success: boolean; limit: number; remaining: number; resetAt: number }> {
  cleanup()

  const now = nowSeconds()
  const entry = cache.get(identifier)

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + windowSeconds
    cache.set(identifier, { count: 1, resetAt })
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, resetAt }
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count += 1
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}
