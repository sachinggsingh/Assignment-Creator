import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/session'
import { connectDB } from '@/lib/db'
import { Assignment } from '@/models/assignment'
import { GeneratedAssignment } from '@/models/generatedAssignment'
import { SubmitAssignment } from '@/models/submitAssignment'
import { getGeminiModel } from '@/lib/ai/gemini-provider'
import { generateText } from 'ai'
import crypto from 'crypto'

export const maxDuration = 300 // Allow up to 5 minutes for AI grading

// Helper to generate Cloudinary signature for secure uploads
function generateCloudinarySignature(params: Record<string, any>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const signString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join('&') + apiSecret
  return crypto.createHash('sha1').update(signString).digest('hex')
}

// Helper to upload PDF to Cloudinary
async function uploadToCloudinary(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<any> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || 'demo'
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`

  const formData = new FormData()
  formData.append('file', base64Data)

  if (apiKey && apiSecret) {
    const timestamp = String(Math.round(Date.now() / 1000))
    const paramsToSign = { timestamp }
    const signature = generateCloudinarySignature(paramsToSign, apiSecret)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)
  } else {
    // If no credentials, we fall back to a default unsigned preset
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim() || 'ml_default'
    formData.append('upload_preset', preset)
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to upload to Cloudinary')
  }

  return data
}

export async function POST(request: Request) {
  try {
    console.log('[POST /api/submissions] Authenticating user...')
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Forbidden. Only student accounts can submit assignments.' },
        { status: 403 }
      )
    }

    console.log(`[POST /api/submissions] Student verified: ${user.name} (${user.id}). Parsing form data...`)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const assignmentId = formData.get('assignmentId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 })
    }

    await connectDB()

    // 1. Fetch original assignment and answer keys
    console.log(`[POST /api/submissions] Loading assignment ${assignmentId}...`)
    const assignment = await Assignment.findById(assignmentId).lean()
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const generatedAssignment = await GeneratedAssignment.findOne({ assignmentId }).lean()
    if (!generatedAssignment) {
      return NextResponse.json(
        { error: 'This assignment does not have AI-generated questions or rubrics.' },
        { status: 400 }
      )
    }

    // 2. Upload file to Cloudinary
    console.log(`[POST /api/submissions] Uploading PDF to Cloudinary...`)
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    
    let uploadResult
    try {
      uploadResult = await uploadToCloudinary(fileBuffer, file.name, file.type)
    } catch (uploadError: any) {
      console.error('[POST /api/submissions] Cloudinary upload failed:', uploadError)
      return NextResponse.json(
        { error: `Cloudinary upload failed: ${uploadError.message}. Make sure your Cloudinary environment variables are configured.` },
        { status: 500 }
      )
    }

    const pdfUrl = uploadResult.secure_url
    const publicId = uploadResult.public_id
    const pagesCount = Number(uploadResult.pages) || 1
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || 'demo'

    console.log(`[POST /api/submissions] Upload successful! URL: ${pdfUrl}, Pages: ${pagesCount}`)

    // 3. Generate page images from Cloudinary
    const pageImages: string[] = []
    for (let pageNum = 1; pageNum <= pagesCount; pageNum++) {
      // Cloudinary serves page images by changing the extension to png/jpg and prepending pg_<num>
      const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/pg_${pageNum}/${publicId}.png`
      pageImages.push(imageUrl)
    }

    console.log('[POST /api/submissions] Formed page image URLs:', pageImages)

    // 4. Download page images as base64 buffers for Gemini
    console.log('[POST /api/submissions] Fetching page images as base64 buffers...')
    const pageBuffers: { base64: string; mimeType: string }[] = []
    
    for (const url of pageImages) {
      try {
        const imageResponse = await fetch(url)
        if (!imageResponse.ok) {
          throw new Error(`Cloudinary returned status ${imageResponse.status}`)
        }
        const imgArrayBuffer = await imageResponse.arrayBuffer()
        const base64 = Buffer.from(imgArrayBuffer).toString('base64')
        pageBuffers.push({
          base64,
          mimeType: 'image/png',
        })
      } catch (imageError) {
        console.error(`[POST /api/submissions] Failed to download page image from ${url}:`, imageError)
        return NextResponse.json(
          { error: `Failed to prepare PDF pages as images. Cloudinary may still be processing the document.` },
          { status: 500 }
        )
      }
    }

    // 5. Invoke Gemini 2.5 Flash for multimodal grading
    console.log('[POST /api/submissions] Calling Gemini 2.5 Flash with multimodal attachments...')
    
    const rubricText = JSON.stringify(generatedAssignment.sections, null, 2)
    const totalMarks = generatedAssignment.totalMarks || 10

    const prompt = `You are an elite academic grader. You are grading a student's handwritten or typed PDF assessment against the official assignment structure and answer keys.

Official Assignment Rubric & Answer Key:
${rubricText}

Below are the page images of the student's submission.
Review the pages carefully to locate the answers for each question.
For each question:
1. Locate the student's response.
2. Evaluate it against the correct answer or model answer.
3. Award fair marks (use integers or half-marks, e.g. 0, 0.5, 1, 1.5, 2 etc.) up to the maximum marks specified for that question.
4. Transcribe or summarize what the student answered in "studentAnswerText". If they did not attempt it, put "Not attempted".
5. Write clear, constructive feedback on what they got right, what was missing, or how they can improve.

Your response must be ONLY a valid JSON object matching this exact structure:
{
  "questionsFeedback": [
    {
      "questionText": "Question text from the rubric...",
      "marksObtained": 4.5,
      "maxMarks": 5,
      "studentAnswerText": "Student response transcribed or summarized...",
      "feedback": "Specific feedback explaining the grade..."
    }
  ],
  "generalFeedback": "Helpful overall feedback summary...",
  "score": 14.5
}

Rules:
- Do not write any markdown code fences, no \`\`\`json, no preamble, and no explanation. Output ONLY the raw JSON string.
- The "score" field must be the sum of all "marksObtained".
- Be fair and encouraging but strict on correctness.
`

    const gradingResult = await generateText({
      model: getGeminiModel(),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            ...pageBuffers.map((pb) => ({
              type: 'image' as const,
              image: Buffer.from(pb.base64, 'base64'),
              mimeType: pb.mimeType,
            })),
          ],
        },
      ],
      temperature: 0.1,
    })

    let content = gradingResult.text.trim()
    console.log('[POST /api/submissions] Gemini responded. Length:', content.length)

    // Strip code fences if returned by the LLM
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/```\s*$/, '').trim()
    }

    let parsedResult
    try {
      parsedResult = JSON.parse(content)
    } catch (parseError) {
      console.error('[POST /api/submissions] Failed to parse Gemini response as JSON. Content:', content)
      return NextResponse.json(
        { error: 'AI grading returned an invalid JSON response structure. Please try submitting again.' },
        { status: 502 }
      )
    }

    if (!parsedResult.questionsFeedback || !Array.isArray(parsedResult.questionsFeedback)) {
      return NextResponse.json(
        { error: 'AI grading returned incomplete data (missing questionsFeedback array).' },
        { status: 502 }
      )
    }

    // 6. Save grading results in MongoDB
    console.log('[POST /api/submissions] Saving submission to MongoDB...')
    const submission = await SubmitAssignment.create({
      assignmentId,
      studentId: user.id,
      studentName: user.name,
      pdfUrl,
      pageImages,
      score: Number(parsedResult.score) || 0,
      totalMarks,
      feedback: parsedResult.generalFeedback || '',
      questionsFeedback: parsedResult.questionsFeedback,
      status: 'graded',
    })

    console.log('[POST /api/submissions] Submission saved successfully. ID:', submission._id)
    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/submissions] Fatal Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')

    await connectDB()

    const query: Record<string, any> = {}

    // Students only fetch their own submissions. Teachers can fetch all submissions.
    if (user.role === 'student') {
      query.studentId = user.id
    }

    if (assignmentId) {
      query.assignmentId = assignmentId
    }

    const submissions = await SubmitAssignment.find(query)
      .populate('assignmentId', 'title')
      .sort({ createdAt: -1 })
      .lean()
    
    // Return array of submissions
    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('[GET /api/submissions] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}
