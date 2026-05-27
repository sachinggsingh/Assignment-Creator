import { Queue } from "bullmq";
import { redisConnection } from "@/lib/redis/redis";

export const assignmentQueue = new Queue(
    "assignment-generation", {
    connection: redisConnection as any
}
)
