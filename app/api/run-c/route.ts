import { NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function isCommandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`${command} --version`, (error) => {
      resolve(!error);
    });
  });
}

function cleanup(dir: string) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Cleanup error:', e);
  }
}

export async function POST(req: Request) {
  let executionDir = '';
  try {
    const { code, stdin = '' } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code content is required' }, { status: 400 });
    }

    console.log(`[C Runner] Received compile & run request (stdin len: ${stdin.length})`);

    // METHOD A: If COMPILER_SERVICE_URL (Render backend) is configured, forward to Render
    const remoteCompilerBase = process.env.COMPILER_SERVICE_URL;
    if (remoteCompilerBase && !remoteCompilerBase.includes('localhost') && !remoteCompilerBase.includes('127.0.0.1')) {
      try {
        const renderUrl = `${remoteCompilerBase.replace(/\/$/, '')}/api/run-c`;
        console.log(`[C Runner] Forwarding execution to Render compiler: ${renderUrl}`);
        const renderRes = await fetch(renderUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, stdin }),
        });

        if (renderRes.ok) {
          const renderData = await renderRes.json();
          return NextResponse.json(renderData);
        } else {
          console.warn(`[C Runner] Render returned status ${renderRes.status}. Falling back to secondary runner.`);
        }
      } catch (renderErr: any) {
        console.warn(`[C Runner] Render remote compiler error: ${renderErr.message}. Falling back.`);
      }
    }

    // METHOD B: Execute locally using GCC if installed on host
    const localGccAvailable = await isCommandAvailable('gcc');

    if (localGccAvailable) {
      const runId = crypto.randomUUID();
      executionDir = path.join(process.cwd(), '.temp_runs_c', runId);
      fs.mkdirSync(executionDir, { recursive: true });

      const sourceFilePath = path.join(executionDir, 'main.c');
      fs.writeFileSync(sourceFilePath, code);
      const isWindows = process.platform === 'win32';
      const outputBinary = isWindows ? 'main.exe' : 'main';

      // Compile C source code with -O2 and -lm (math library)
      const compileCmd = `gcc -O2 main.c -o ${outputBinary} -lm`;
      console.log(`[C Runner] Compiling main.c locally: ${compileCmd}`);

      const compileResult = await new Promise<{ code: number; stderr: string }>((resolve) => {
        exec(compileCmd, { cwd: executionDir, timeout: 10000 }, (error, stdout, stderr) => {
          if (error) {
            const isTimeout = error.killed || error.signal === 'SIGTERM';
            const errorMsg = isTimeout 
              ? 'Compilation timed out! The C compiler took too long to build. Please check for macro or header issues.' 
              : (stderr || error.message || 'Compilation failed.');
            resolve({ code: error.code || 1, stderr: errorMsg });
          } else {
            resolve({ code: 0, stderr: '' });
          }
        });
      });

      if (compileResult.code !== 0) {
        cleanup(executionDir);
        return NextResponse.json({
          language: 'c',
          version: 'local-gcc',
          run: {
            stdout: '',
            stderr: compileResult.stderr,
            code: compileResult.code,
            signal: null,
            output: compileResult.stderr
          }
        });
      }

      // Execute compiled C executable
      console.log(`[C Runner] Running binary ./${outputBinary}...`);
      const binaryPath = isWindows ? path.join(executionDir, outputBinary) : `./${outputBinary}`;

      const runResult = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
        const child = spawn(binaryPath, [], { cwd: executionDir });

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });

        if (stdin && stdin.trim() !== '') {
          child.stdin.write(stdin);
          child.stdin.end();
        } else {
          child.stdin.end();
        }

        let timedOut = false;
        const timeoutId = setTimeout(() => {
          timedOut = true;
          console.warn(`[C Runner] Execution timed out after 10s. Killing process.`);
          child.kill('SIGKILL');
        }, 10000);

        child.on('close', (exitCode, signal) => {
          clearTimeout(timeoutId);
          let errOutput = stderrData;
          if (timedOut) {
            errOutput = 'Execution timed out! The C program ran longer than 10 seconds (check for infinite loops in while/for).';
          } else if (signal === 'SIGSEGV') {
            errOutput = 'Segmentation Fault (SIGSEGV): Memory access violation! Check pointers, array bounds, or uninitialized memory.';
          }
          resolve({
            stdout: stdoutData,
            stderr: errOutput,
            code: exitCode
          });
        });

        child.on('error', (err) => {
          clearTimeout(timeoutId);
          resolve({
            stdout: '',
            stderr: `Execution error: ${err.message}`,
            code: 1
          });
        });
      });

      cleanup(executionDir);

      return NextResponse.json({
        language: 'c',
        version: 'local-gcc',
        run: {
          stdout: runResult.stdout,
          stderr: runResult.stderr,
          code: runResult.code === null ? 124 : runResult.code,
          signal: runResult.code === null ? 'SIGKILL' : null,
          output: runResult.stdout + runResult.stderr
        }
      });
    }

    // METHOD C: Fallback to JDoodle Cloud API (for cloud serverless deployment like Vercel)
    const jdoodleKeys = [
      { id: process.env.JDOODLE_CLIENT_ID_1, secret: process.env.JDOODLE_CLIENT_SECRET_1 },
      { id: process.env.JDOODLE_CLIENT_ID_2, secret: process.env.JDOODLE_CLIENT_SECRET_2 },
      { id: process.env.JDOODLE_CLIENT_ID_3, secret: process.env.JDOODLE_CLIENT_SECRET_3 },
      { id: process.env.JDOODLE_CLIENT_ID_4, secret: process.env.JDOODLE_CLIENT_SECRET_4 }
    ].filter(k => k.id && k.secret);

    if (jdoodleKeys.length > 0) {
      for (let i = 0; i < jdoodleKeys.length; i++) {
        const { id, secret } = jdoodleKeys[i];
        try {
          const response = await fetch('https://api.jdoodle.com/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: id,
              clientSecret: secret,
              script: code,
              language: 'c',
              versionIndex: '5', // GCC 11.1.0
              stdin: stdin,
            }),
          });

          if (!response.ok) continue;

          const data = await response.json();
          const outputText = data.output || '';
          if (outputText.includes('Daily limit reached') || outputText.includes('Credit limit reached')) {
            continue;
          }

          const isError = data.statusCode && data.statusCode !== 200;
          return NextResponse.json({
            language: 'c',
            version: 'jdoodle-gcc',
            run: {
              stdout: isError ? '' : outputText,
              stderr: isError ? outputText : '',
              code: isError ? 1 : 0,
              signal: null,
              output: outputText
            }
          });
        } catch (err) {
          console.warn(`JDoodle key ${i + 1} error:`, err);
        }
      }
    }

    // METHOD D: Fallback to Piston Public Execution Engine
    try {
      const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'c',
          version: '10.2.0',
          files: [{ name: 'main.c', content: code }],
          stdin: stdin
        })
      });

      if (pistonRes.ok) {
        const pistonData = await pistonRes.json();
        const run = pistonData.run || {};
        return NextResponse.json({
          language: 'c',
          version: 'piston-gcc',
          run: {
            stdout: run.stdout || '',
            stderr: run.stderr || '',
            code: run.code ?? 0,
            signal: run.signal || null,
            output: run.output || ''
          }
        });
      }
    } catch (pistonErr: any) {
      console.warn('Piston fallback error:', pistonErr.message);
    }

    return NextResponse.json({
      error: 'C Compiler is currently offline. Please configure your Render compiler URL or local GCC.'
    }, { status: 503 });

  } catch (error: any) {
    if (executionDir) cleanup(executionDir);
    return NextResponse.json({ error: error.message || 'Execution failed' }, { status: 500 });
  }
}
