import { generateText } from 'ai';
import { getGeminiModel } from '@/lib/ai/gemini-provider';
import { type GenerateAssignmentInput } from '@/types/type';

function buildPrompt(input: GenerateAssignmentInput): string {
  // Build a hyper-descriptive, human-readable prompt with ACTUAL values
  const sectionDescriptions = input.questionTypes
    .map((qt, i) => {
      const sectionLabel = `Section ${i + 1}`;
      const totalSectionMarks = qt.numberOfQuestions * qt.marksPerQuestion;

      let typeInstruction = '';
      switch (qt.type) {
        case 'MCQ':
          typeInstruction = `Multiple Choice Questions. Each question MUST have exactly 4 options labeled A, B, C, D. Provide the correct answer letter.`;
          break;
        case 'True/False':
          typeInstruction = `True or False questions. Each question MUST have exactly 2 options: "True" and "False". Provide the correct answer.`;
          break;
        case 'Short Answer':
          typeInstruction = `Short Answer questions. No options needed. Provide a brief correct answer (1-2 sentences).`;
          break;
        case 'Long Answer':
          typeInstruction = `Long Answer / Essay questions. No options needed. Provide a model answer outline as the answer.`;
          break;
        default:
          typeInstruction = `${qt.type} questions. Provide appropriate options if applicable and a correct answer.`;
      }

      return `- ${sectionLabel}: Generate exactly ${qt.numberOfQuestions} ${qt.type} question(s) at "${qt.difficulty}" difficulty. Each question is worth ${qt.marksPerQuestion} mark(s). Section total = ${totalSectionMarks} marks. ${typeInstruction}`;
    })
    .join('\n');

  const totalMarks = input.questionTypes.reduce(
    (sum, qt) => sum + qt.numberOfQuestions * qt.marksPerQuestion,
    0
  );

  const totalQuestions = input.questionTypes.reduce(
    (sum, qt) => sum + qt.numberOfQuestions,
    0
  );

  const additionalContext = input.additionalInstructions
    ? `\n\nAdditional context from the teacher: "${input.additionalInstructions}"`
    : '';

  return `You are an expert educator creating an assessment titled "${input.title}".

Generate exactly ${input.questionTypes.length} section(s) with a grand total of ${totalQuestions} questions worth ${totalMarks} marks.

Here is what each section must contain:
${sectionDescriptions}
${additionalContext}

Respond with ONLY a valid JSON object (no markdown, no code fences, no explanation). Use this exact structure:

{"sections":[{"title":"Section Name","instructions":"Brief instruction","totalMarks":10,"questions":[{"questionText":"...","difficulty":"easy","marks":2,"type":"MCQ","options":["A","B","C","D"],"answer":"A"}]}],"totalMarks":${totalMarks}}

Rules:
- Each section title should be descriptive (e.g. "Multiple Choice Questions", "Short Answer Section").
- "options" array is required ONLY for MCQ and True/False. For Short Answer and Long Answer, set "options" to an empty array [].
- "answer" is always required for every question.
- "marks" for each question must be exactly ${input.questionTypes.map(qt => qt.marksPerQuestion).join(' or ')} as specified per section.
- "difficulty" must match what was requested per section.
- Keep question text concise (1-2 sentences max). Keep answers brief.
- Do NOT add any text before or after the JSON.`;
}

export async function generateAssignment(input: GenerateAssignmentInput) {
  console.log('[generateAssignment] Building AI prompt...');
  const prompt = buildPrompt(input);
  console.log('[generateAssignment] Prompt length:', prompt.length, 'chars');

  try {
    console.log('[generateAssignment] Calling Gemini API...');
    console.time('[generateAssignment] API Duration');

    const result = await generateText({
      model: getGeminiModel(),
      prompt,
      temperature: 0.2,
      maxOutputTokens: 8192,
      abortSignal: AbortSignal.timeout(60_000), // 60 second hard timeout
    });

    const { text, finishReason } = result;
    console.log('[generateAssignment] Finish reason:', finishReason);

    if (finishReason === 'length') {
      throw new Error('AI response was truncated — try reducing the number of questions or marks per question.');
    }

    console.timeEnd('[generateAssignment] API Duration');

    let content = text.trim();

    // Strip markdown code fences if the model still wraps output
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    if (!content || content.length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    console.log('[generateAssignment] Response length:', content.length, 'chars');

    let data;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      console.error('[generateAssignment] JSON parse failed. First 500 chars:', content.substring(0, 500));
      throw new Error(`Invalid JSON from API: ${(parseError as Error).message}`);
    }

    if (!data.sections || !Array.isArray(data.sections)) {
      throw new Error('Invalid response: missing sections array');
    }

    return {
      prompt,
      sections: data.sections,
      totalMarks: data.totalMarks,
      rawText: JSON.stringify(data),
      modelId: 'gemini-2.5-flash',
    };
  } catch (error) {
    console.error('[generateAssignment] Failed:', error);
    throw error instanceof Error ? error : new Error('Assignment generation failed');
  }
}