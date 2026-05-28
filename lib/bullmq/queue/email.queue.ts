import { Queue } from "bullmq"
import { getRedisConnection } from "../../redis/redis"

const isBuild = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";

export const emailQueue = isBuild
  ? ({} as unknown as Queue)
  : new Queue('email-notification', {
      connection: getRedisConnection(),
    })