import "dotenv/config"
import { normalizeRedisUrl } from "../lib/redis/redis"

const required = ["REDIS_URL", "MONGODB_URI", "GEMINI_API_KEY"] as const
const missing = required.filter((key) => !process.env[key]?.trim())

if (missing.length > 0) {
  console.error(`[Worker] Missing required env: ${missing.join(", ")}`)
  process.exit(1)
}

const redisUrl = normalizeRedisUrl(process.env.REDIS_URL!)
if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
  console.error("[Worker] REDIS_URL must start with redis:// or rediss://")
  process.exit(1)
}

console.log("[Worker] Redis target:", redisUrl.replace(/:[^:@]+@/, ":***@"))

import "../lib/bullmq/worker/assignment.worker"
import "../lib/bullmq/worker/email.worker"

console.log("[Worker] Assignment + email workers started")
