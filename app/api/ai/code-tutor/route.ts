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

    // Determine student's intent
    const trimmedQ = (question || '').trim().toLowerCase();
    const isGreeting = /^(hai|hi|hello|hey|hola|good\s*(morning|afternoon|evening))\b/i.test(trimmedQ);
    const isTimeComplexity = /time\s*complexity|space\s*complexity|big\s*o/i.test(trimmedQ);
    const isExplicitErrorRequest = !question || 
      /explain\s*(what\s*is\s*wrong|why\s*(my\s*)?code\s*fail|the\s*error|how\s*to\s*fix)|fix\s*(my\s*)?code|bug|error\s*diagnostic/i.test(trimmedQ);
    const isConceptOrGeneralQuestion = !isExplicitErrorRequest && !isGreeting && !isTimeComplexity;

    // 2. Prepare System Prompt for student pedagogy
    const systemPrompt = `You are "VVS CodeTutor", an expert, direct, and encouraging Computer Science tutor for 1st-year C students.

RESPONSE RULES:
1. ANSWER THE EXACT QUESTION: Always address the student's actual question directly:
   - If they ask "Explain about pointers": explain pointers clearly with a tiny 2-line code example.
   - If they ask "What is the time complexity...": analyze the loops in their code and state Time Complexity and Space Complexity.
   - If they say "hi" or "hello": greet them warmly in 1 short sentence.
   - ONLY if they explicitly ask to fix or explain a code error/bug: use the 2-section format:
     ❌ **Problem:** (1-2 sentences on the exact line and mistake)
     💡 **How to Fix:** (1-2 sentences on the exact fix)

2. BE CONCISE: Keep all responses under 60-80 words so students can read them instantly while coding.`;

    // 3. Prepare User Message
    let userPrompt = '';
    if (isGreeting) {
      userPrompt = `Student says: "${question}". Please greet them warmly in 1 short sentence and ask what C concept or coding question they want help with today.`;
    } else if (isTimeComplexity) {
      userPrompt = `Student Question: "${question}"\n\n`;
      if (code) {
        userPrompt += `Student's C Code:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
      }
      userPrompt += `Please analyze the student's code and state its Time Complexity and Space Complexity with a brief 1-sentence reason. Do NOT diagnose compiler errors.`;
    } else if (isConceptOrGeneralQuestion) {
      userPrompt = `Student Question: "${question}"\n\n`;
      if (code) {
        userPrompt += `Student's Current C Code:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
      }
      userPrompt += `Please answer the student's question directly, clearly, and concisely (under 75 words) with a tiny code snippet if helpful. Do NOT diagnose compiler errors.`;
    } else {
      // Explicit error diagnosis request
      userPrompt = `The student ran their C program and encountered an error. Please state the exact problem and how to fix it.\n\n`;
      if (code) userPrompt += `Student's C Code:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
      if (errorOutput) userPrompt += `Compiler / Runtime Error Output:\n\`\`\`\n${errorOutput}\n\`\`\`\n\n`;
      if (testFailures && testFailures.length > 0) {
        userPrompt += `Failed Test Case Details:\n`;
        testFailures.forEach((tf: any, idx: number) => {
          userPrompt += `- Test Case #${idx + 1}: Input: "${tf.input || '(none)'}", Expected: "${tf.expected}", Actual Got: "${tf.actual}"\n`;
        });
        userPrompt += `\n`;
      }
      if (ruleResult.hasMatch) {
        userPrompt += `[System Diagnostic Hint: Heuristic detected ${ruleResult.errorType}. Explanation: ${ruleResult.explanation}. Suggested fix: ${ruleResult.hint}]\n\n`;
      }
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
    } else if (isTimeComplexity) {
      fallbackText = `⏱️ **Time Complexity:** O(N) — iterates through the loop N times.\n💾 **Space Complexity:** O(1) — operates in-place with fixed memory.`;
    } else if (isConceptOrGeneralQuestion) {
      if (/pointer/i.test(question)) {
        fallbackText = `A **pointer** is a variable that stores the memory address of another variable. You declare it using \`*\` and get an address using \`&\`:\n\`\`\`c\nint x = 10;\nint *ptr = &x; // ptr holds memory address of x\nprintf("%d", *ptr); // prints 10\n\`\`\``;
      } else {
        fallbackText = `Here is the explanation for your question:\nIn C programming, ensure your variable declarations, data types, and loop conditions match your intended logic.`;
      }
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
      ruleAnalysis: isExplicitErrorRequest ? ruleResult : { hasMatch: false }
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
