import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Assignment, AssignmentState, CreateAssignmentPayload } from '@/types/type'

const initialState: AssignmentState & { formSnapshot?: CreateAssignmentPayload | null } = {
  status: 'idle',
  error: null,
  createdAssignment: null,
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

export const createAssignment = createAsyncThunk(
  'assignments/createAssignment',
  async (payload: CreateAssignmentPayload, { rejectWithValue, signal }) => {
    try {
      // 1. Submit the generation request
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
      
      // 2. Poll for completion
      while (true) {
        if (signal.aborted) {
          return rejectWithValue('Request was cancelled.')
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

        if (pollData.state === 'completed') {
          return pollData.assignment as Assignment
        } else if (pollData.state === 'failed') {
          return rejectWithValue(pollData.error || 'Assignment generation failed')
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000))
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
    },
    setFormSnapshot(state, action) {
      state.formSnapshot = action.payload
    },
    clearFormSnapshot(state) {
      state.formSnapshot = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createAssignment.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.createdAssignment = null
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.error = null
        state.createdAssignment = action.payload
      })
      .addCase(createAssignment.rejected, (state, action) => {
        if (action.meta.aborted) {
          state.status = 'idle'
          return
        }
        state.status = 'failed'
        state.error =
          typeof action.payload === 'string' ? action.payload : 'Failed to create assignment'
      })
      .addCase(discardAssignment.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(discardAssignment.fulfilled, (state) => {
        state.status = 'idle'
        state.error = null
        state.createdAssignment = null
      })
      .addCase(discardAssignment.rejected, (state, action) => {
        state.status = 'failed'
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to discard assignment'
      })
  },
})

export const { resetAssignmentStatus, setFormSnapshot, clearFormSnapshot } = assignmentSlice.actions
export default assignmentSlice.reducer
