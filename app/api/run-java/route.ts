import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, stdin = '' } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code content is required' }, { status: 400 });
    }

    // Query Piston runtimes dynamically to detect the exact installed Java version
    let javaVersion = '15.0.2'; // Fallback default
    try {
      const runtimesRes = await fetch('https://emkc.org/api/v2/piston/runtimes');
      if (runtimesRes.ok) {
        const runtimes = await runtimesRes.json();
        const javaRuntime = runtimes.find((r: any) => r.language === 'java' || (r.aliases && r.aliases.includes('java')));
        if (javaRuntime && javaRuntime.version) {
          javaVersion = javaRuntime.version;
        }
      }
    } catch (err) {
      console.warn('Dynamic runtime detection failed, using fallback version:', err);
    }

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'java',
        version: javaVersion,
        files: [
          {
            name: 'Main.java',
            content: code,
          },
        ],
        stdin: stdin,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      return NextResponse.json({ error: `Piston execution failed: ${errorMsg}` }, { status: 500 });
    }

    const data = await response.json();
    // Return Piston execution details: stdout, stderr, etc.
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
