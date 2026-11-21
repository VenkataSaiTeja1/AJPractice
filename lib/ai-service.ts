// Unified AI & Rule-Based Heuristics Service for Student Tutor & Faculty Analytics

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface RuleAnalysisResult {
  hasMatch: boolean;
  errorType: string;
  lineSnippet?: string;
  explanation: string;
  hint: string;
}

/**
 * Deterministic, instant (0ms, 0 API calls) C & Data Structures Error Analyzer
 */
export function analyzeCRuleBased(
  code: string,
  errorOutput: string = '',
  testFailures: { input?: string; expected?: string; actual?: string }[] = []
): RuleAnalysisResult {
  const cleanCode = code || '';
  const cleanError = errorOutput || '';

  // 1. Reverse loop with i++ instead of i--
  const reverseLoopMatch = cleanCode.match(/for\s*\(\s*(?:int\s+)?([a-zA-Z_]\w*)\s*=\s*[^;]+;\s*\1\s*>=\s*0\s*;\s*\1\s*\+\+\s*\)/);
  if (reverseLoopMatch) {
    const varName = reverseLoopMatch[1];
    return {
      hasMatch: true,
      errorType: 'Infinite Reverse Loop (Off-by-Direction Bug)',
      lineSnippet: reverseLoopMatch[0],
      explanation: `Your reverse loop decrements towards 0, but you wrote \`${varName}++\` instead of \`${varName}--\`. Because \`${varName}\` keeps increasing, the condition \`${varName} >= 0\` never becomes false, leading to an infinite loop, memory bounds violation, and Segmentation Fault.`,
      hint: `Change \`${varName}++\` to \`${varName}--\` in your for loop statement.`
    };
  }

  // 2. scanf without & operator for primitive variables
  const scanfPrimitiveMatch = cleanCode.match(/scanf\s*\(\s*"[^"]*%[d|i|f|c|u|x|ld|lf][^"]*"\s*,\s*([a-zA-Z_]\w*)\s*\)/);
  if (scanfPrimitiveMatch) {
    const varName = scanfPrimitiveMatch[1];
    // Check if varName was declared as a pointer or array (e.g. char str[], int* ptr)
    const isArrayOrPtr = new RegExp(`(?:char|int|float|double)\\s*(?:\\*\\s*${varName}|${varName}\\s*\\[)`).test(cleanCode);
    if (!isArrayOrPtr) {
      return {
        hasMatch: true,
        errorType: 'Missing Address-Of (&) in scanf',
        lineSnippet: scanfPrimitiveMatch[0],
        explanation: `In \`scanf\`, the variable \`${varName}\` was passed by value instead of by memory reference. \`scanf\` requires the memory address where the input should be stored.`,
        hint: `Add the \`&\` address operator before the variable: \`scanf("%...", &${varName});\``
      };
    }
  }

  // 3. Accidental semicolon after if, for, or while
  const prematureSemicolonMatch = cleanCode.match(/(?:for|while|if)\s*\([^)]*\)\s*;/);
  if (prematureSemicolonMatch && !cleanCode.includes('do {')) {
    return {
      hasMatch: true,
      errorType: 'Premature Semicolon on Control Statement',
      lineSnippet: prematureSemicolonMatch[0],
      explanation: `You placed a semicolon \`;\` immediately after your control statement condition. This terminates the loop or conditional before its body executes. For loops, this creates an empty loop or runs the body only once.`,
      hint: `Remove the semicolon immediately following the closing parenthesis \`)\` of your statement.`
    };
  }

  // 4. Insecure gets() usage
  if (/\bgets\s*\(/.test(cleanCode)) {
    return {
      hasMatch: true,
      errorType: 'Deprecated & Unsafe gets() Usage',
      lineSnippet: 'gets(...)',
      explanation: 'The `gets()` function does not perform buffer boundary checks and has been removed from standard C. It causes stack buffer overflows.',
      hint: 'Replace `gets(str)` with `fgets(str, sizeof(str), stdin);` and remove the trailing newline if needed.'
    };
  }

  // 5. Segmentation Fault / SIGSEGV
  if (/Segmentation Fault|SIGSEGV|core dumped|exit code 139/i.test(cleanError)) {
    return {
      hasMatch: true,
      errorType: 'Segmentation Fault (Memory Access Violation)',
      explanation: 'Your program attempted to read or write to a memory address that it does not own. This typically happens when accessing array indices out of bounds (negative index or index >= size), dereferencing an uninitialized or NULL pointer, or running an infinite recursive loop.',
      hint: 'Inspect all array accesses `arr[i]` and check whether `i` ever exceeds the allocated size. Verify all pointers are assigned with `malloc` or `&variable` before dereferencing (`*ptr`).'
    };
  }

  // 6. Floating Point Exception / SIGFPE
  if (/Floating Point Exception|SIGFPE|division by zero/i.test(cleanError)) {
    return {
      hasMatch: true,
      errorType: 'Arithmetic Exception (Division by Zero)',
      explanation: 'Your program attempted to divide a number by zero or performed an illegal modulo operation (`% 0`).',
      hint: 'Verify the denominator before dividing or using `%`. Add a check: `if (denominator != 0) { ... }`.'
    };
  }

  // 7. Output Mismatch Analysis (Test Case Failures)
  if (testFailures.length > 0) {
    const firstFail = testFailures[0];
    const expected = (firstFail.expected || '').trim();
    const actual = (firstFail.actual || '').trim();

    if (expected.toLowerCase() === actual.toLowerCase() && expected !== actual) {
      return {
        hasMatch: true,
        errorType: 'Letter Case Mismatch',
        explanation: `Your output values match the expected result, but letter casing differs. Expected "${firstFail.expected}" while your program produced "${firstFail.actual}".`,
        hint: 'Check for uppercase vs lowercase characters in your output format strings.'
      };
    }

    if (firstFail.expected && firstFail.actual && firstFail.actual.includes(firstFail.expected)) {
      return {
        hasMatch: true,
        errorType: 'Extra Characters in Output',
        explanation: 'Your program printed the correct answer, but included extra text (such as interactive prompts like "Enter number:" or extra labels) that automated grading considers incorrect.',
        hint: 'Remove any input prompts before scanf/fgets. The automated grader only expects the exact answer output.'
      };
    }
  }

  return {
    hasMatch: false,
    errorType: 'General Logic or Syntax Issue',
    explanation: 'No specific rule matched. A detailed AI analysis will evaluate your source code.',
    hint: 'Review your variable initializations and loop boundary conditions.'
  };
}

/**
 * Call Groq Cloud API (Llama 3.3 70B / Llama 3.1 8B)
 */
async function callGroq(
  messages: { role: string; content: string }[],
  systemPrompt?: string
): Promise<string> {
  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: fullMessages,
      temperature: 0.3,
      max_tokens: 1024
    }),
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Groq API returned ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Call Google Gemini API (Gemini 1.5 Flash / 2.0 Flash)
 */
async function callGemini(
  messages: { role: string; content: string }[],
  systemPrompt?: string
): Promise<string> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const payload: any = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  // Use Gemini 1.5 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API returned ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return text;
}

/**
 * Main AI Dispatcher with Groq -> Gemini -> Rule-based Auto-Failover
 */
export async function executeAiQuery(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  fallbackText: string = ''
): Promise<{ text: string; provider: 'groq' | 'gemini' | 'rule_based' }> {
  // 1. Try Groq (Fastest, highest quality Llama 3.3 70B, 14,400 free req/day)
  if (GROQ_API_KEY) {
    try {
      const response = await callGroq(messages, systemPrompt);
      if (response && response.trim()) {
        return { text: response, provider: 'groq' };
      }
    } catch (groqErr: any) {
      console.warn('[AI Service] Groq attempt failed, failing over to Gemini:', groqErr.message);
    }
  }

  // 2. Try Gemini (Gemini 1.5 Flash, 1,500 free req/day)
  if (GEMINI_API_KEY) {
    try {
      const response = await callGemini(messages, systemPrompt);
      if (response && response.trim()) {
        return { text: response, provider: 'gemini' };
      }
    } catch (geminiErr: any) {
      console.warn('[AI Service] Gemini attempt failed, falling back to rule-based engine:', geminiErr.message);
    }
  }

  // 3. Fallback to rule-based explanation
  return {
    text: fallbackText || 'The AI service is temporarily unavailable. Please refer to compiler messages and review loop bounds or pointer definitions.',
    provider: 'rule_based'
  };
}
