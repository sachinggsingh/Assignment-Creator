import IORedis from "ioredis"

let redisConnection: IORedis | null = null

export function getRedisConnection() {
  if (!redisConnection) {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is missing")
    }

    redisConnection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })

    redisConnection.on("connect", () => {
      console.log("Redis connected")
    })

    redisConnection.on("error", (err) => {
      console.error("Redis error:", err.message)
    })
  }

  return redisConnection
}