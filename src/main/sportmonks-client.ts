import type { ApiErrorCode, SportmonksRateLimit } from '@shared/contracts'
import { z } from 'zod'

const cooldowns = new Map<string, Map<string, SportmonksError>>()
let generation = 0

export class SportmonksError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly rateLimit?: SportmonksRateLimit
  ) {
    super(message)
  }
}

export function clearSportmonksRateLimits(): void {
  generation += 1
  cooldowns.clear()
}

export async function requestSportmonks<T>(
  url: URL,
  token: string,
  schema: z.ZodType<T>,
  fetcher: typeof fetch
): Promise<T> {
  const requestGeneration = generation
  const entity = url.pathname.split('/')[3]
  const cooldown = cooldowns.get(token)?.get(entity)
  if (cooldown?.rateLimit && cooldown.rateLimit.resetsAt > Date.now()) throw cooldown
  cooldowns.get(token)?.delete(entity)

  let response: Response
  try {
    response = await fetcher(url, {
      headers: { Accept: 'application/json', Authorization: token },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) {
    const error = await errorForResponse(response)
    if (error.code === 'rate_limited' && requestGeneration === generation) {
      let tokenCooldowns = cooldowns.get(token)
      if (!tokenCooldowns) {
        tokenCooldowns = new Map()
        cooldowns.set(token, tokenCooldowns)
      }
      tokenCooldowns.set(entity, error)
    }
    throw error
  }

  try {
    return schema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }
}

const rateLimitErrorResponseSchema = z
  .object({
    retry_after: z.number().nonnegative().optional(),
    rate_limit: z
      .object({
        remaining: z.number().nonnegative().optional(),
        requested_entity: z.string().min(1).optional(),
        resets_in_seconds: z.number().nonnegative().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough()

async function errorForResponse(response: Response): Promise<SportmonksError> {
  if (response.status === 401) {
    return new SportmonksError('unauthorized', 'Sportmonks rejected this token.')
  }

  if (response.status === 403) {
    return new SportmonksError('forbidden', 'Your Sportmonks plan does not include this data.')
  }

  if (response.status === 429) {
    const rateLimit = (await rateLimitFromErrorResponse(response)) ?? {
      estimated: true,
      remaining: 0,
      resetsAt: Date.now() + 60 * 60 * 1_000
    }

    return new SportmonksError(
      'rate_limited',
      'The Sportmonks rate limit has been reached.',
      rateLimit
    )
  }

  return new SportmonksError('upstream', `Sportmonks returned an error (${response.status}).`)
}

async function rateLimitFromErrorResponse(
  response: Response
): Promise<SportmonksRateLimit | undefined> {
  const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'))

  try {
    const body: unknown = await response.json()
    const result = rateLimitErrorResponseSchema.safeParse(body)
    if (!result.success && retryAfterSeconds === undefined) return undefined

    const resetSeconds = result.success
      ? (result.data.rate_limit?.resets_in_seconds ?? result.data.retry_after ?? retryAfterSeconds)
      : retryAfterSeconds
    if (resetSeconds === undefined) return undefined

    const remainingHeader = Number(response.headers.get('x-ratelimit-remaining'))

    return {
      estimated: false,
      remaining:
        (result.success ? result.data.rate_limit?.remaining : undefined) ??
        (Number.isFinite(remainingHeader) ? remainingHeader : 0),
      requestedEntity: result.success ? result.data.rate_limit?.requested_entity : undefined,
      resetsAt: Date.now() + resetSeconds * 1_000
    }
  } catch {
    if (retryAfterSeconds === undefined) return undefined

    return {
      estimated: false,
      remaining: 0,
      resetsAt: Date.now() + retryAfterSeconds * 1_000
    }
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds

  const resetAt = Date.parse(value)
  return Number.isNaN(resetAt) ? undefined : Math.max(0, (resetAt - Date.now()) / 1_000)
}
