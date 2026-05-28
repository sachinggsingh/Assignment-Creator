import express from "express"
import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ExpressAdapter } from "@bull-board/express"

import { assignmentQueue } from "../lib/bullmq/queue/assignment.queue"
import { emailQueue } from "../lib/bullmq/queue/email.queue"

const serverAdapter = new ExpressAdapter()

serverAdapter.setBasePath("/admin/queues")

createBullBoard({
    queues: [
      new BullMQAdapter(assignmentQueue),
      new BullMQAdapter(emailQueue)
    ],
    serverAdapter,
})

const app = express()

app.use("/admin/queues", serverAdapter.getRouter())

app.listen(3001, () => {
    console.log("Bull Board running on http://localhost:3001/admin/queues")
})
//  helo