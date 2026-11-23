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
    const systemPrompt = `You are "VVS CodeTutor", a direct, helpful, and student-friendly C programming tutor for 1st-year students.

CRITICAL INSTRUCTIONS FOR STUDENT-FRIENDLY REPLIES:
1. NO FLUFF OR ESSAYS: Do NOT write conversational introductions (like "Hello! Let's fix this step-by-step"), multi-step lectures, or long paragraphs. Students are in a coding lab/exam and need to see the exact issue and fix in 5 seconds.
2. FOR ANY ERROR, TYPO, OR BUG: ALWAYS format your reply using ONLY these two clear sections:

❌ **Problem:**
State the exact line number, typo, or logic mistake in 1-2 simple sentences.

💡 **How to Fix:**
Give the exact 1-line correction or code snippet in 1-2 simple sentences.

3. FOR GREETINGS: If the student says "hai", "hello", or "hi", reply in 1 short sentence:
"Hi! I'm your AI Code Tutor. What C concept or error can I help you with today?"

4. FOR GENERAL CONCEPT QUESTIONS: Keep explanation under 3 bullet points with a 2-line code example.

5. TOTAL LENGTH: Keep the entire response under 50-70 words!`;

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
      userPrompt += `The student ran their C program and encountered an error. Please state the exact problem and how to fix it.\n\n`;
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
      userPrompt += `[System Diagnostic Hint: Heuristic detected ${ruleResult.errorType}. Explanation: ${ruleResult.explanation}. Suggested fix: ${ruleResult.hint}]\n\n`;
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
      fallbackText = `Hi! 👋 I'm your **VVS AI CodeTutor**. What C concept or error can I help you with today?`;
    } else if (ruleResult.hasMatch) {
      fallbackText = `❌ **Problem:**\n${ruleResult.explanation}\n\n💡 **How to Fix:**\n${ruleResult.hint}`;
    } else if (testFailures && testFailures.length > 0) {
      const tf = testFailures[0];
      fallbackText = `❌ **Problem:**\nOutput mismatch. Expected \`${tf.expected || ''}\` but your program produced \`${tf.actual || ''}\`.\n\n💡 **How to Fix:**\nCheck for trailing newlines (\`\\n\`), extra spaces, or string termination (\`\\0\`).`;
    } else if (errorOutput && errorOutput.trim()) {
      const firstLine = errorOutput.trim().split('\n')[0];
      fallbackText = `❌ **Problem:**\n${firstLine}\n\n💡 **How to Fix:**\nInspect the line number indicated above and correct the syntax or variable declaration.`;
    } else {
      fallbackText = `Hi! What C programming question or error can I help you fix?`;
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
