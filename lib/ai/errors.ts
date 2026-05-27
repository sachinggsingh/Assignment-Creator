import { APICallError } from '@ai-sdk/provider'

function getGeminiModelId() {
  return (process.env.GEMINI_MODEL?.trim() || 'minimaxai/minimax-m2.7') as string
}
function getRetryAfterSeconds(error: APICallError): number | null {
  const headers = error.responseHeaders
  if (!headers) {
    return null
  }

  const retryAfter =
    headers['retry-after'] ??
    headers['Retry-After'] ??
    headers['x-ratelimit-reset-requests']

  if (!retryAfter) {
    return null
  }

  const numeric = Number(retryAfter)
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.ceil(numeric)
  }

  const retryDate = Date.parse(retryAfter)
  if (!Number.isNaN(retryDate)) {
    return Math.max(1, Math.ceil((retryDate - Date.now()) / 1000))
  }

  return null
}

export function formatAiError(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Generation was cancelled.'
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      const modelId = getGeminiModelId()
      const retryAfter = getRetryAfterSeconds(error)
      const waitHint = retryAfter
        ? ` Wait about ${retryAfter} second${retryAfter === 1 ? '' : 's'}, then click Regenerate.`
        : ' Wait about a minute, then click Regenerate.'

      return `Gemini rate limit reached for model "${modelId}".${waitHint}`
    }

    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'Invalid or unauthorized Gemini API key. Check GEMINI_API_KEY in your .env file.'
    }

    if (error.statusCode === 404) {
      const modelId = getGeminiModelId()
      return `The configured Gemini model "${modelId}" was not found. Update GEMINI_MODEL in your .env file.`
    }

    if (error.statusCode != null && error.statusCode >= 500) {
      return 'Gemini is temporarily unavailable. Please wait a moment and click Regenerate.'
    }
  }

  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes('GEMINI_API_KEY') ||
    message.includes('GOOGLE_GENERATIVE_AI_API_KEY') ||
    message.includes('Gemini API key')
  ) {
    return 'Gemini API key is not configured. Add GEMINI_API_KEY to your .env file.'
  }

  if (message.includes('429') || /quota/i.test(message)) {
    const modelId = getGeminiModelId()
    return `Gemini rate limit or quota exceeded for model "${modelId}". Wait about a minute, then click Regenerate.`
  }

  if (message.includes('404') && /model/i.test(message)) {
    const modelId = getGeminiModelId()
    return `The configured Gemini model "${modelId}" was not found. Update GEMINI_MODEL in your .env file.`
  }

  if (message.includes('API key') || message.includes('401')) {
    return 'Invalid Gemini API key. Check GEMINI_API_KEY in your .env file.'
  }

  return message
}
