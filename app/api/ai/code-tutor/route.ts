import { NextResponse } from 'next/server';
import { analyzeCRuleBased, executeAiQuery } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      code = '', 
      errorOutput = '', 
      testFailures = [], 
      question = '', 
      chatHistory = [] 
    } = body;

    // 1. Run instant rule-based diagnosis first
    const ruleResult = analyzeCRuleBased(code, errorOutput, testFailures);

    // Check if the student message is a conversational greeting or chat question
    const trimmedQ = (question || '').trim().toLowerCase();
    const isGreeting = /^(hai|hi|hello|hey|hola|good\s*(morning|afternoon|evening))\b/i.test(trimmedQ);
    const isGeneralQuestion = question && question.trim().length > 0 && !errorOutput && testFailures.length === 0;

    // 2. Prepare System Prompt for student pedagogy
    const systemPrompt = `You are "VVS CodeTutor", an expert, empathetic, and encouraging Computer Science Tutor helping 1st-Year engineering students master C Programming and Data Structures (arrays, pointers, linked lists, stacks, queues).

PEDAGOGICAL TEACHING RULES:
1. GREETINGS & CONVERSATION: If the student simply says hello, hi, or greets you, respond warmly and ask what C programming concept or problem they would like to explore today.
2. CONCEPTUAL QUESTIONS: If they ask about concepts (e.g., pointers, recursion, memory allocation, arrays), explain clearly with short, intuitive analogies and tiny code examples.
3. ERROR DIAGNOSIS: If their code produced an error or output mismatch, explain the exact root cause in plain English (e.g. reverse loop incrementing instead of decrementing, or trailing newline from fgets).
4. DO NOT SPOON-FEED ENTIRE SOLUTIONS: Give guided hints and explain WHY rather than just writing out the complete code.
5. CONCISE & STRUCTURED: Keep responses focused and readable under 180 words.
6. TONE: Warm, encouraging, supportive.`;

    // 3. Prepare User Message
    let userPrompt = '';
    if (isGreeting) {
      userPrompt = `Student says: "${question}". Please greet them warmly and ask how you can help them with C programming or their coding practice.`;
    } else if (question && question.trim()) {
      userPrompt += `Student Question: "${question}"\n\n`;
      if (code && !isGeneralQuestion) {
        userPrompt += `Student's Current C Code:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
      }
      if (errorOutput) {
        userPrompt += `Compiler / Runtime Error:\n\`\`\`\n${errorOutput}\n\`\`\`\n\n`;
      }
      if (testFailures && testFailures.length > 0) {
        userPrompt += `Failed Test Case Details:\n`;
        testFailures.forEach((tf: any, idx: number) => {
          userPrompt += `- Test Case #${idx + 1}: Input: "${tf.input || '(none)'}", Expected: "${tf.expected}", Actual Got: "${tf.actual}"\n`;
        });
        userPrompt += `\n`;
      }
    } else {
      userPrompt += `The student ran their C program and encountered an error. Please explain what went wrong and guide them on how to fix it.\n\n`;
      if (code) userPrompt += `Student's C Code:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
      if (errorOutput) userPrompt += `Compiler / Runtime Error Output:\n\`\`\`\n${errorOutput}\n\`\`\`\n\n`;
      if (testFailures && testFailures.length > 0) {
        userPrompt += `Failed Test Case Details:\n`;
        testFailures.forEach((tf: any, idx: number) => {
          userPrompt += `- Test Case #${idx + 1}: Input: "${tf.input || '(none)'}", Expected: "${tf.expected}", Actual Got: "${tf.actual}"\n`;
        });
        userPrompt += `\n`;
      }
    }

    if (ruleResult.hasMatch && !isGreeting) {
      userPrompt += `[System Hint: Local heuristic identified: ${ruleResult.errorType}. Explanation: ${ruleResult.explanation}]\n\n`;
    }

    // Build conversation history
    const messages = [
      ...chatHistory.slice(-4).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: 'user', content: userPrompt }
    ];

    // Fallback text if both AI providers are offline
    let fallbackText = '';
    if (isGreeting) {
      fallbackText = `Hello! 👋 I'm your **VVS AI CodeTutor**. How are you doing today?\n\nFeel free to ask me anything about C programming, pointers, loops, data structures, or click **"Explain Error"** if your code is running into bugs!`;
    } else if (ruleResult.hasMatch) {
      fallbackText = `### ⚠️ ${ruleResult.errorType}\n\n**What happened:**\n${ruleResult.explanation}\n\n**Hint:**\n${ruleResult.hint}`;
    } else if (testFailures && testFailures.length > 0) {
      const tf = testFailures[0];
      fallbackText = `### ⚠️ Test Case Mismatch\n\nYour program compiled and ran, but the output did not match what the test case expected.\n\n• **Expected:** \`${tf.expected || '(expected)'}\`\n• **Actual Output:** \`${tf.actual || '(actual)'}\`\n\n**Hint:**\nCheck for trailing newline differences (\`\\n\`), extra space characters, or string length mismatches (e.g. from \`fgets\`).`;
    } else if (errorOutput && errorOutput.trim()) {
      fallbackText = `### ⚠️ Compiler / Runtime Diagnostic\n\n\`\`\`\n${errorOutput.trim()}\n\`\`\`\n\n**Hint:**\nInspect the exact line numbers and memory accesses reported above to resolve the error.`;
    } else {
      fallbackText = `Hello! How can I help you with your code today? You can ask me any question about C syntax, loops, memory management, or debugging.`;
    }

    const aiResult = await executeAiQuery(messages, systemPrompt, fallbackText);

    return NextResponse.json({
      reply: aiResult.text,
      provider: aiResult.provider,
      ruleAnalysis: ruleResult
    });

  } catch (err: any) {
    console.error('[AI Code Tutor Error]:', err.message);
    return NextResponse.json({
      reply: 'An error occurred while analyzing the code. Please review your variable declarations and loop bounds.',
      provider: 'rule_based',
      error: err.message
    }, { status: 500 });
  }
}
