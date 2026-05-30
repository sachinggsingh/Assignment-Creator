import { Worker } from "bullmq"
import { createBullMQConnection } from "../../redis/redis"
import { sendMail } from "../../mail/sendMail"

new Worker(
  "email-notification",
  async (job) => {
    try {
      const { email, assignmentTitle } = job.data

      await sendMail(
        email,
        "Assignment Created",
        `Your assignment "${assignmentTitle}" has been created successfully`
      )
      console.log("Email Sent")
    } catch (error) {
      console.log(error)
      throw error
    }
  },
  {
    connection: createBullMQConnection() as unknown as any,
  }
)