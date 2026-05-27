import "dotenv/config"
import "@/lib/bullmq/worker/assignment.worker"

import "@/lib/bullmq/worker/email.worker"

console.log("Workers Started")