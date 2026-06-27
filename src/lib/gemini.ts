import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// ─── Parse raw Gemini response text into JSON ──────────────────────────────
const parseJsonFromText = (text: string): any => {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("No valid JSON found in response");
  }
};

// ─── Generic Gemini helper ─────────────────────────────────────────────────
const geminiText = async (prompt: string): Promise<string> => {
  let lastError: any;
  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Error with ${modelName}:`, err?.message || err);
        
        // If it's a 503 (high demand), try the next model in the array
        if (err?.message?.includes('503')) {
          continue;
        }
        
        // If it's some other error, throw it immediately
        throw err;
      }
    }
    
    // If both models returned 503, wait 2 seconds before the final retry
    if (attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw lastError || new Error("AI generation failed due to high demand. Please try again.");
};

// ─── Generate mock test MCQ questions from a text prompt ──────────────────
export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const generateMockTestQuestions = async (
  prompt: string,
  numQuestions: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  language: string = 'English'
): Promise<GeneratedQuestion[]> => {
  const systemPrompt = `You are an expert educational test creator for the CynexAI Learning Management System.

Generate exactly ${numQuestions} high-quality multiple-choice quiz questions based on the following topic or content:
"${prompt}"

Requirements:
- Language: ${language}
- Difficulty: ${difficulty}
- Each question must have exactly 4 options (option A, B, C, D)
- Only one option must be correct
- All incorrect options must be plausible but clearly wrong
- Include a concise explanation for the correct answer
- Questions must be specific, educational, and not trivial

Return ONLY a valid JSON array with NO markdown formatting, NO extra text, in this exact structure:
[
  {
    "text": "The complete question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this answer is correct.",
    "difficulty": "${difficulty}"
  }
]

The "correctAnswer" field is a zero-based index (0 = first option, 1 = second, 2 = third, 3 = fourth).`;

  const text = await geminiText(systemPrompt);
  const parsed = parseJsonFromText(text);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini did not return a JSON array");
  }

  return parsed.slice(0, numQuestions).map((q: any, i: number) => ({
    text: String(q.text || `Question ${i + 1}`),
    options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : ['A', 'B', 'C', 'D'],
    correctAnswer: typeof q.correctAnswer === 'number' ? Math.min(Math.max(q.correctAnswer, 0), 3) : 0,
    explanation: String(q.explanation || 'No explanation provided.'),
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : difficulty,
  }));
};

// ─── Generate lesson summary and chapters ─────────────────────────────────
export const generateLessonSummaryAndChapters = async (
  title: string,
  description: string = ""
): Promise<{ summary: string; chapters: { time: string; title: string }[] }> => {
  try {
    const prompt = `Analyze this lesson title and description:
Title: "${title}"
Description: "${description}"

Generate a short, engaging summary (max 3 sentences) and a list of 4 logical video chapters (with timestamps like "00:00", "05:00", etc.).
Return ONLY valid JSON in the exact format:
{
  "summary": "The summary text here...",
  "chapters": [
    { "time": "00:00", "title": "Introduction to concept" },
    { "time": "05:30", "title": "Main topic deep dive" }
  ]
}`;
    const text = await geminiText(prompt);
    return parseJsonFromText(text);
  } catch (e) {
    console.error("Gemini generateLessonSummaryAndChapters error:", e);
    return { summary: "Failed to generate summary.", chapters: [] };
  }
};

// ─── Generate AI explanations for existing questions ──────────────────────
export const generateQuestionExplanations = async (
  questions: { text: string; options: string[]; correctAnswer: number }[]
): Promise<string[]> => {
  try {
    const questionsJson = JSON.stringify(questions.slice(0, 10));
    const prompt = `For each of these quiz questions, provide a concise, educational explanation (1-2 sentences) for why the correct answer is right.

Questions (JSON):
${questionsJson}

Return ONLY a valid JSON array of explanation strings, one per question, in the same order. No markdown, no extra text.
Example: ["Explanation for Q1.", "Explanation for Q2."]`;
    const text = await geminiText(prompt);
    const parsed = parseJsonFromText(text);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (e) {
    console.error("Gemini generateQuestionExplanations error:", e);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── CYNEX AI TOOLBAR ACTIONS ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export interface QuestionPatch {
  id: string;
  text?: string;
  options?: string[];
  explanation?: string;
}

// Helper: build compact input JSON for action prompts
const buildInput = (questions: { id: string; text: string; options?: string[]; explanation?: string }[]) =>
  questions.map(q => ({
    id: q.id,
    text: q.text,
    options: q.options || [],
    explanation: q.explanation || ''
  }));

// ─── 1. Fix Spelling & Grammar ────────────────────────────────────────────
export const fixSpellingAndGrammar = async (
  questions: { id: string; text: string; options?: string[]; explanation?: string }[]
): Promise<QuestionPatch[]> => {
  const prompt = `You are a professional educational content editor.
Fix ALL spelling mistakes, grammar errors, punctuation issues, and awkward phrasing in these quiz questions.
Do NOT change the meaning, difficulty, or correct answer index of any question.

Input JSON:
${JSON.stringify(buildInput(questions))}

Return ONLY a valid JSON array. Each item must have "id" and the corrected "text", "options", and "explanation".
No markdown, no extra text.`;

  const text = await geminiText(prompt);
  return parseJsonFromText(text) as QuestionPatch[];
};

// ─── 2. Translate Questions ────────────────────────────────────────────────
export const translateQuestions = async (
  questions: { id: string; text: string; options?: string[]; explanation?: string }[],
  targetLanguage: string
): Promise<QuestionPatch[]> => {
  const prompt = `You are a professional educational translator.
Translate ALL quiz question content into ${targetLanguage}.
Translate: question text, all options, and explanations.
Do NOT change the correctAnswer index.

Input JSON:
${JSON.stringify(buildInput(questions))}

Return ONLY a valid JSON array of patches with id, text, options, and explanation for every question.
No markdown, no extra text.`;

  const text = await geminiText(prompt);
  return parseJsonFromText(text) as QuestionPatch[];
};

// ─── 3. Add Answer Explanations ───────────────────────────────────────────
export const addAnswerExplanationsAI = async (
  questions: { id: string; text: string; options?: string[]; correctAnswer?: number; explanation?: string }[]
): Promise<QuestionPatch[]> => {
  const input = questions.map(q => ({
    id: q.id,
    text: q.text,
    options: q.options || [],
    correctAnswer: q.correctAnswer ?? 0,
    currentExplanation: q.explanation || ''
  }));

  const prompt = `You are an expert educator and assessment designer.
For EACH quiz question below, write a clear and educational explanation (2-3 sentences) that explains:
1. Why the correct answer (at index "correctAnswer") is right
2. Why the other options are wrong (briefly)

Input JSON:
${JSON.stringify(input)}

Return ONLY a valid JSON array where each item has "id" and "explanation".
No markdown, no extra text.
Example: [{"id":"q_1","explanation":"Option A is correct because..."}]`;

  const text = await geminiText(prompt);
  return parseJsonFromText(text) as QuestionPatch[];
};

// ─── 4. Make Simple ───────────────────────────────────────────────────────
export const makeSimple = async (
  questions: { id: string; text: string; options?: string[]; explanation?: string }[]
): Promise<QuestionPatch[]> => {
  const prompt = `You are an educational content simplifier.
Rewrite the quiz questions below using simpler vocabulary and shorter sentences so they are easier to understand for beginners.
Rules:
- Do NOT change the meaning or correct answer index
- Use simple, everyday words (avoid jargon)
- Shorten sentences where possible
- Keep all 4 options but simplify their wording too

Input JSON:
${JSON.stringify(buildInput(questions))}

Return ONLY a valid JSON array of patches with id, text, and options for every question.
No markdown, no extra text.`;

  const text = await geminiText(prompt);
  return parseJsonFromText(text) as QuestionPatch[];
};

// ─── 5. Change Format ────────────────────────────────────────────────────
export const changeQuestionFormat = async (
  questions: { id: string; text: string; options?: string[]; explanation?: string }[]
): Promise<QuestionPatch[]> => {
  const prompt = `You are an expert assessment designer.
Reformat the quiz questions below to improve clarity and professional presentation:
- Rephrase question text to start with action words ("Which...", "What...", "How...", "Identify...")
- Make options parallel in structure (all start with noun, or all start with verb, etc.)
- Ensure consistent punctuation and capitalization across all options
- Do NOT change the correct answer index

Input JSON:
${JSON.stringify(buildInput(questions))}

Return ONLY a valid JSON array of patches with id, text, and options for every question.
No markdown, no extra text.`;

  const text = await geminiText(prompt);
  return parseJsonFromText(text) as QuestionPatch[];
};

// ─── Evaluate Student SQL query using Gemini ───────────────────────────────
export const evaluateSQLQueryAI = async (
  questionText: string,
  teacherExplanation: string,
  studentQuery: string
): Promise<{ score: number; isCorrect: boolean; feedback: string }> => {
  const prompt = `You are an expert SQL evaluator.
Evaluate if the student's query is logically correct and satisfies the requirements of the database query question.
Note that the student is writing queries against the classic Oracle EMP/DEPT database tables (emp and dept).

Teacher's Question: "${questionText}"
Teacher's Model Answer / Explanation: "${teacherExplanation}"
Student's Executed Query: "${studentQuery}"

Evaluate if the student's query is logically correct and satisfies the question.
Students can write queries in different ways (using different aliases, different JOIN styles, or capitalization), but their logical output must match the intent of the question.
Provide a score between 0 to 100 representing how correct their query is. If it meets at least 80% correctness, set isCorrect to true. Otherwise, set it to false.

Return ONLY a valid JSON object with NO markdown formatting, NO extra text, in this exact structure:
{
  "score": <number from 0 to 100>,
  "isCorrect": <true or false>,
  "feedback": "<brief constructive feedback explaining if their logic is correct, and if they made any minor errors>"
}`;

  try {
    const text = await geminiText(prompt);
    const parsed = parseJsonFromText(text);
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      isCorrect: typeof parsed.isCorrect === 'boolean' ? parsed.isCorrect : false,
      feedback: String(parsed.feedback || 'No feedback provided.')
    };
  } catch (e) {
    console.error("Gemini evaluateSQLQueryAI error:", e);
    // Fallback: literal string cleanup comparison
    const cleanStudent = studentQuery?.trim().replace(/\\s+/g, ' ').toLowerCase();
    const cleanTeacher = teacherExplanation?.trim().replace(/\\s+/g, ' ').toLowerCase();
    const matches = cleanStudent === cleanTeacher || (cleanStudent && cleanTeacher && cleanTeacher.includes(cleanStudent));
    return {
      score: matches ? 100 : 0,
      isCorrect: !!matches,
      feedback: "Semantic grading offline. Performed fallback literal matching."
    };
  }
};

