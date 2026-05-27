import IORedis from "ioredis"

const redisUrl = process.env.REDIS_URL
const redisHost = process.env.REDIS_HOST || "127.0.0.1"
const redisPort = Number(process.env.REDIS_PORT || 6379)

export const redisConnection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    })