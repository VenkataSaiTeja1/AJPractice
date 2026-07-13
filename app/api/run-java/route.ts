import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, stdin = '' } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code content is required' }, { status: 400 });
    }

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'java',
        version: '15.0.0',
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
