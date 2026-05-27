import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Assignment, AssignmentState, CreateAssignmentPayload } from '@/types/type'

const initialState: AssignmentState = {
  status: 'idle',
  error: null,
  createdAssignment: null,
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
      return data.assignment as Assignment
    } catch (error) {
      if (signal.aborted) {
        return rejectWithValue('Request was cancelled.')
      }
      const message = error instanceof Error ? error.message : 'Failed to create assignment'
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
  },
})

export const { resetAssignmentStatus } = assignmentSlice.actions
export default assignmentSlice.reducer
