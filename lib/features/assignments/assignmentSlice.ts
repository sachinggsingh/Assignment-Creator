import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Assignment, AssignmentState, CreateAssignmentPayload } from '@/types/type'

const POLL_INTERVAL_MS = 800
const POLL_TIMEOUT_MS = 120_000
const STUCK_WAITING_MS = 45_000

const initialState: AssignmentState & { formSnapshot?: CreateAssignmentPayload | null } = {
  status: 'idle',
  error: null,
  createdAssignment: null,
  generationState: null,
  generationProgress: 0,
  formSnapshot: null,
}

async function readApiError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error
    }
  } catch {
    // ignore
  }
  return `Request failed with status ${response.status}`
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

export const createAssignment = createAsyncThunk(
  'assignments/createAssignment',
  async (payload: CreateAssignmentPayload, { rejectWithValue, signal, dispatch }) => {
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          additionalInstructions: payload.additionalInstructions?.trim() || undefined,
        }),
        credentials: 'same-origin',
        signal,
      })

      if (!response.ok) {
        return rejectWithValue(await readApiError(response))
      }

      const data = await response.json()

      if (!data.jobId) {
        return rejectWithValue('No job ID returned from server')
      }

      const { jobId } = data
      const startedAt = Date.now()
      let lastProgress = 0
      let lastProgressAt = startedAt

      while (true) {
        if (signal.aborted) {
          return rejectWithValue('Request was cancelled.')
        }

        const elapsed = Date.now() - startedAt
        if (elapsed > POLL_TIMEOUT_MS) {
          return rejectWithValue(
            'Generation timed out. Ensure the background worker is running in production and uses the same REDIS_URL as the web app.'
          )
        }

        const pollRes = await fetch(`/api/assignments/job/${jobId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          signal,
        })

        if (!pollRes.ok) {
          return rejectWithValue(await readApiError(pollRes))
        }

        const pollData = await pollRes.json()

        if (typeof pollData.state === 'string') {
          dispatch(
            setGenerationStatus({
              state: pollData.state,
              progress: typeof pollData.progress === 'number' ? pollData.progress : lastProgress,
            })
          )
        }

        if (typeof pollData.progress === 'number' && pollData.progress > lastProgress) {
          lastProgress = pollData.progress
          lastProgressAt = Date.now()
        }

        if (pollData.state === 'completed') {
          return pollData.assignment as Assignment
        }

        if (pollData.state === 'failed') {
          return rejectWithValue(pollData.error || 'Assignment generation failed')
        }

        if (
          pollData.state === 'waiting' &&
          lastProgress === 0 &&
          Date.now() - startedAt > STUCK_WAITING_MS
        ) {
          return rejectWithValue(
            'Job is still waiting in the queue. Start the worker process (npm run worker) in production with the same REDIS_URL as this app.'
          )
        }

        if (
          (pollData.state === 'active' || pollData.state === 'waiting') &&
          lastProgress === 0 &&
          Date.now() - lastProgressAt > STUCK_WAITING_MS
        ) {
          return rejectWithValue(
            'Generation appears stuck. Check worker logs and GEMINI_API_KEY on the worker service.'
          )
        }

        await sleep(POLL_INTERVAL_MS, signal)
      }
    } catch (error) {
      if (signal.aborted) {
        return rejectWithValue('Request was cancelled.')
      }
      const message = error instanceof Error ? error.message : 'Failed to create assignment'
      return rejectWithValue(message)
    }
  }
)

export const discardAssignment = createAsyncThunk(
  'assignments/discardAssignment',
  async (assignmentId: string, { rejectWithValue, signal }) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        signal,
      })

      if (!res.ok) {
        try {
          const data = await res.json()
          return rejectWithValue(data?.error || 'Failed to discard assignment')
        } catch {
          return rejectWithValue(`Request failed with status ${res.status}`)
        }
      }

      return { success: true }
    } catch (error) {
      if (signal.aborted) return rejectWithValue('Request was cancelled')
      const message = error instanceof Error ? error.message : 'Failed to discard assignment'
      return rejectWithValue(message)
    }
  }
)

const assignmentSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    resetAssignmentStatus(state) {
      state.status = 'idle'
      state.error = null
      state.createdAssignment = null
      state.generationState = null
      state.generationProgress = 0
    },
    setFormSnapshot(state, action) {
      state.formSnapshot = action.payload
    },
    clearFormSnapshot(state) {
      state.formSnapshot = null
    },
    setGenerationStatus(
      state,
      action: { payload: { state: string; progress: number } }
    ) {
      state.generationState = action.payload.state
      state.generationProgress = action.payload.progress
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createAssignment.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.createdAssignment = null
        state.generationState = 'waiting'
        state.generationProgress = 0
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.error = null
        state.createdAssignment = action.payload
        state.generationState = 'completed'
        state.generationProgress = 100
      })
      .addCase(createAssignment.rejected, (state, action) => {
        if (action.meta.aborted) {
          state.status = 'idle'
          return
        }
        state.status = 'failed'
        state.error =
          typeof action.payload === 'string' ? action.payload : 'Failed to create assignment'
        state.generationState = 'failed'
      })
      .addCase(discardAssignment.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(discardAssignment.fulfilled, (state) => {
        state.status = 'idle'
        state.error = null
        state.createdAssignment = null
        state.generationState = null
        state.generationProgress = 0
      })
      .addCase(discardAssignment.rejected, (state, action) => {
        state.status = 'failed'
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to discard assignment'
      })
  },
})

export const {
  resetAssignmentStatus,
  setFormSnapshot,
  clearFormSnapshot,
  setGenerationStatus,
} = assignmentSlice.actions
export default assignmentSlice.reducer
