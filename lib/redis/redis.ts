import IORedis, { type RedisOptions } from "ioredis"

let redisConnection: IORedis | null = null

/** Upstash and most cloud Redis require rediss://; bare //default:...@host breaks ioredis. */
export function normalizeRedisUrl(raw: string): string {
  const url = raw.trim().replace(/^["']|["']$/g, "")

  if (url.startsWith("redis://") || url.startsWith("rediss://")) {
    return url
  }

  if (url.startsWith("//")) {
    return `rediss:${url}`
  }

  if (url.includes("@")) {
    return `rediss://${url.replace(/^\/+/, "")}`
  }

  return url
}

export function getRedisOptions(): RedisOptions {
  const url = normalizeRedisUrl(process.env.REDIS_URL ?? "")
  const useTls = url.startsWith("rediss://")
  const family =
    process.env.REDIS_FAMILY === "6"
      ? 6
      : process.env.REDIS_FAMILY === "4"
        ? 4
        : undefined

  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(useTls ? { tls: {} } : {}),
    ...(family !== undefined ? { family } : {}),
  }
}

export function createBullMQConnection(): IORedis {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is missing")
  }

  const url = normalizeRedisUrl(process.env.REDIS_URL)
  return new IORedis(url, getRedisOptions())
}

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = createBullMQConnection()

    redisConnection.on("connect", () => {
      console.log("Redis connected")
    })

    redisConnection.on("error", (err) => {
      console.error("Redis error:", err.message)
    })
  }

  return redisConnection
}
