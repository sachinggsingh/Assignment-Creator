import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/redis/redis";

const isBuild = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";

export const assignmentQueue = isBuild
  ? ({} as unknown as Queue)
  : new Queue('assignment-generation', { connection: getRedisConnection() })
