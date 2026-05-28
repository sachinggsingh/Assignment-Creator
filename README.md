# AssessMind - AI-Powered Assessment Generator

AssessMind is a modern, full-stack web application designed to automatically generate high-quality assignments and assessments using Artificial Intelligence. It leverages the Vercel AI SDK with Google's Gemini models and robust background job processing for seamless user experiences.

## 🏗️ System Architecture & Design

This project is built using a modern decoupled architecture that separates the frontend interaction layer from heavy background processing tasks.

### Technology Stack

* **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Shadcn UI, Redux Toolkit
* **Backend API:** Next.js Serverless API Routes
* **Database:** MongoDB (via Mongoose)
* **Message Queue / Job Processing:** BullMQ & Redis
* **AI Engine:** Vercel AI SDK (@ai-sdk/google) with Gemini
* **Authentication:** Custom JWT-based auth via Next.js Middleware
* **Monitoring:** Bull-Board (Queue UI)

### High-Level Workflow

```mermaid
graph TD
    Client[Client Browser] -->|POST /api/assignments/generate| API[Next.js API Route]
    API -->|Validates & Enqueues| Redis[(Redis Queue)]
    API -.->|Returns Job ID| Client
    
    subgraph Background Worker Process
        Redis -->|Pulls Job| AssignWorker[Assignment Worker]
        AssignWorker -->|Calls LLM| Gemini[Google Gemini AI]
        Gemini -.->|Generated JSON| AssignWorker
        AssignWorker -->|Saves to DB| MongoDB[(MongoDB)]
        AssignWorker -->|Enqueues Email| Redis
        Redis -->|Pulls Email Job| EmailWorker[Email Worker]
        EmailWorker -->|Sends Mail| SMTP[Nodemailer]
    end
```

### Core Components

1. **Next.js Web App:**
   - Handles the user interface, routing, state management (Redux), and authentication.
   - API routes (`/api/*`) act as the gateway to the database and background queues. When a user requests an assignment, the API responds instantly after placing a job in the queue, rather than blocking the UI while the AI generates the content.

2. **Redis & BullMQ:**
   - A Redis container (via Docker Compose) acts as the central message broker.
   - **BullMQ** manages two primary queues: `assignment-generation` and `email-notification`.

3. **Background Worker Process (`worker.ts`):**
   - A standalone Node.js process (run via `npm run worker`) that actively listens to Redis queues.
   - **Assignment Worker:** Picks up generation tasks, constructs AI prompts, streams requests to Gemini, parses the returned assignment, saves it to MongoDB, and then triggers an email notification job.
   - **Email Worker:** Picks up email tasks and dispatches success notifications to users via Nodemailer.

4. **Queue Monitoring Dashboard (`bull-board.ts`):**
   - A dedicated Express server providing a UI to monitor, pause, and retry BullMQ jobs in real-time.

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Docker (for running Redis)
- MongoDB Cluster (or local instance)
- **Google Gemini API key** — get one at [aistudio.google.com](https://aistudio.google.com/apikey)

### 1. Environment Setup
Clone the repository and install dependencies:
```bash
npm install
```

Ensure your `.env` or `.env.local` contains **all** required variables:
```env
# ── Required ──────────────────────────────────────────────
# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/...

# Auth
JWT_SECRET=your_jwt_secret

# AI  (⚠️ worker will refuse to start without this)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash          # optional, defaults to gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.0-flash-lite  # optional

# Redis
REDIS_URL=redis://127.0.0.1:6379

# ── Optional ──────────────────────────────────────────────
# Email (for assignment notifications)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Cloudinary (for PDF uploads)
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 2. Start Redis
Start the Redis server using Docker Compose:
```bash
docker compose up -d
```

### 3. Run the Application Services

You will need to run the following commands in **separate terminal tabs**:

**Start the Next.js Frontend & API:**
```bash
npm run dev
```
*(Runs on http://localhost:3000)*

**Start the Background Worker Process (⚠️ REQUIRED for AI generation):**
```bash
npm run worker
```
The worker will:
1. Validate that `REDIS_URL`, `MONGODB_URI`, and `GEMINI_API_KEY` are set — exits immediately with a clear error if any are missing.
2. Connect to Redis and start listening for `assignment-generation` and `email-notification` jobs.
3. Log startup diagnostics so you can confirm it's healthy.

> **Without the worker running, assignment generation jobs will stay in the queue indefinitely and never complete.**

**Start the Queue Dashboard (Optional):**
```bash
npm run board
```
*(Runs on http://localhost:3001/admin/queues — View active, failed, and completed jobs)*

### 4. Worker Health Check

A health check endpoint is available to verify the worker and queue status:

```bash
curl http://localhost:3000/api/jobs/health
```

**Response example (healthy):**
```json
{
  "success": true,
  "status": "healthy",
  "queue": { "waiting": 0, "active": 0, "completed": 5, "failed": 0, "delayed": 0, "paused": 0 },
  "workers": 1,
  "redis": "connected",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

| Status     | Meaning                                           |
|------------|---------------------------------------------------|
| `healthy`  | Redis connected, workers processing jobs          |
| `degraded` | Redis connected, but **no workers** are running   |
| `down`     | Redis unreachable (HTTP 503)                      |

### 5. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Worker exits with `❌ missing environment variables` | `.env` is incomplete | Add the missing keys listed in the error |
| Worker logs `ECONNREFUSED 127.0.0.1:6379` | Redis is not running | Run `docker compose up -d` |
| Assignment stays "pending" forever | Worker process is not running | Open a new terminal and run `npm run worker` |
| Health check returns `"status": "degraded"` | Worker is not connected | Start the worker with `npm run worker` |
| AI generation fails with 401/403 | Invalid `GEMINI_API_KEY` | Replace with a valid key from [AI Studio](https://aistudio.google.com/apikey) |

