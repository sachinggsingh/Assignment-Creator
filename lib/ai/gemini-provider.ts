import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  process.env.GEMINI_FALLBACK_MODEL?.trim(),
  'gemini-2.0-flash',
].filter(Boolean) as string[]

export function getGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()

  if (!key) {
    throw new Error('Gemini API key is missing')
  }

  return key
}

let cachedProvider:
  | ReturnType<typeof createGoogleGenerativeAI>
  | null = null

export function getGeminiProvider() {
  if (!cachedProvider) {
    cachedProvider = createGoogleGenerativeAI({
      apiKey: getGeminiApiKey(),
    })
  }

  return cachedProvider
}

export function getGeminiModel(modelId?: string) {
  return getGeminiProvider()(
    modelId || FALLBACK_MODELS[0]
  )
}