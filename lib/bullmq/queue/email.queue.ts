import { Queue } from "bullmq"
import { redisConnection } from "@/lib/redis/redis"

export const emailQueue = new Queue(
  "email-notification",
  {
    connection: redisConnection as any,
  }
)