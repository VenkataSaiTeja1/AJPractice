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

    // 2. Prepare System Prompt for student pedagogy
    const systemPrompt = `You are "VVS CodeTutor", an expert, empathetic, and encouraging Computer Science Tutor helping 1st-Year engineering students master C Programming and Data Structures (arrays, pointers, linked lists, stacks, queues).

PEDAGOGICAL TEACHING RULES:
1. DIAGNOSE CLEARLY: Explain the exact category of error in plain, friendly English (e.g., "Segmentation Fault from Infinite Reverse Loop", "Missing '&' in scanf", "Trailing Newline Mismatch").
2. POINT TO THE ROOT CAUSE: Mention the exact line or pattern causing it (e.g., "Notice your loop condition has i++ instead of i--").
3. DO NOT SPOON-FEED ENTIRE SOLUTIONS: Give a guided hint and explain WHY the error happens so the student learns, rather than just writing the entire completed program for them.
4. BE CONCISE & STRUCTURED: Use short bullet points, markdown bolding, and small code snippets. Keep responses under 180 words.
5. TONE: Warm, encouraging, and supportive. Motivate them to keep coding!`;

    // 3. Prepare User Message with full debugging context
    let userPrompt = '';
    if (question && question.trim()) {
      userPrompt += `Student Question: "${question}"\n\n`;
    } else {
      userPrompt += `The student ran their C program and encountered an error. Please explain what went wrong and guide them on how to fix it.\n\n`;
    }

    if (code) {
      userPrompt += `Student's C Code:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
    }

    if (errorOutput) {
      userPrompt += `Compiler / Runtime Error Output:\n\`\`\`\n${errorOutput}\n\`\`\`\n\n`;
    }

    if (testFailures && testFailures.length > 0) {
      userPrompt += `Failed Test Case Details:\n`;
      testFailures.forEach((tf: any, idx: number) => {
        userPrompt += `- Test Case #${idx + 1}: Input: "${tf.input || '(none)'}", Expected: "${tf.expected}", Actual Got: "${tf.actual}"\n`;
      });
      userPrompt += `\n`;
    }

    if (ruleResult.hasMatch) {
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
    if (ruleResult.hasMatch) {
      fallbackText = `### ⚠️ ${ruleResult.errorType}\n\n**What happened:**\n${ruleResult.explanation}\n\n**Hint:**\n${ruleResult.hint}`;
    } else if (errorOutput && errorOutput.trim()) {
      fallbackText = `### ⚠️ Compiler Diagnostic\n\n**Compiler Output:**\n\`\`\`\n${errorOutput.trim()}\n\`\`\`\n\n**Hint:**\nInspect the exact line and column numbers reported by the compiler to resolve the syntax or declaration error.`;
    } else {
      fallbackText = `### 💡 Error Diagnostics\n\nYour program encountered an execution issue. Please check:\n• Array indices to ensure you are not accessing beyond allocated size\n• Loop conditions (check for infinite loops or reverse loops with \`i++\` instead of \`i--\`)\n• Make sure all pointers point to allocated memory before dereferencing.`;
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
