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

function getLocalGccCommand(): Promise<string | null> {
  return new Promise(async (resolve) => {
    // 1. Check if gcc is directly available in PATH
    const inPath = await isCommandAvailable('gcc');
    if (inPath) return resolve('gcc');

    // 2. Check common Windows installation directories
    if (process.platform === 'win32') {
      const candidates = [
        'C:\\MinGW\\bin\\gcc.exe',
        'C:\\msys64\\ucrt64\\bin\\gcc.exe',
        'C:\\msys64\\mingw64\\bin\\gcc.exe',
        'C:\\TDM-GCC-64\\bin\\gcc.exe',
        'C:\\Program Files\\CodeBlocks\\MinGW\\bin\\gcc.exe',
        'C:\\Program Files (x86)\\Dev-Cpp\\MinGW64\\bin\\gcc.exe'
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          return resolve(`"${p}"`);
        }
      }
    }

    resolve(null);
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
    const requestHost = req.headers.get('host') || '';
    const isSelfHost = remoteCompilerBase && requestHost && remoteCompilerBase.includes(requestHost);

    if (remoteCompilerBase && !isSelfHost && !remoteCompilerBase.includes('localhost') && !remoteCompilerBase.includes('127.0.0.1')) {
      try {
        const renderUrl = `${remoteCompilerBase.replace(/\/$/, '')}/api/run-c`;
        console.log(`[C Runner] Forwarding execution to Render compiler: ${renderUrl}`);
        const renderController = new AbortController();
        const renderTimeout = setTimeout(() => renderController.abort(), 15000);

        const renderRes = await fetch(renderUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, stdin }),
          signal: renderController.signal
        });
        clearTimeout(renderTimeout);

        if (renderRes.ok) {
          const renderData = await renderRes.json();
          if (renderData && renderData.run) {
            return NextResponse.json(renderData);
          }
        } else {
          console.warn(`[C Runner] Render returned status ${renderRes.status}. Falling back to secondary runner.`);
        }
      } catch (renderErr: any) {
        console.warn(`[C Runner] Render remote compiler error: ${renderErr.message}. Falling back.`);
      }
    }

    // METHOD B: Execute locally using GCC if installed on host / server
    const localGccCmd = await getLocalGccCommand();

    if (localGccCmd) {
      const runId = crypto.randomUUID();
      executionDir = path.join(process.cwd(), '.temp_runs_c', runId);
      fs.mkdirSync(executionDir, { recursive: true });

      const sourceFilePath = path.join(executionDir, 'main.c');
      fs.writeFileSync(sourceFilePath, code);
      const isWindows = process.platform === 'win32';
      const outputBinary = isWindows ? 'main.exe' : 'main';

      // Compile C source code with -O2 and -lm (math library)
      const compileCmd = `${localGccCmd} -O2 main.c -o ${outputBinary} -lm`;
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
          output: runResult.stdout + (runResult.stderr ? '\n' + runResult.stderr : '')
        }
      });
    }

    // METHOD C: Wandbox Cloud Compiler API (Fast, Free, No API Key, GCC 13.2.0)
    try {
      console.log('[C Runner] Trying Wandbox GCC compiler...');
      const wandboxController = new AbortController();
      const wandboxTimeout = setTimeout(() => wandboxController.abort(), 12000);

      const wandboxRes = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          compiler: 'gcc-13.2.0-c',
          stdin: stdin || ''
        }),
        signal: wandboxController.signal
      });
      clearTimeout(wandboxTimeout);

      if (wandboxRes.ok) {
        const wandboxData = await wandboxRes.json();
        const statusCode = parseInt(wandboxData.status || '0', 10);
        const compilerErr = wandboxData.compiler_error || wandboxData.compiler_message || '';
        const programOut = wandboxData.program_output || '';
        const programErr = wandboxData.program_error || '';

        // If compilation failed
        if (statusCode !== 0 && !programOut && compilerErr) {
          return NextResponse.json({
            language: 'c',
            version: 'wandbox-gcc',
            run: {
              stdout: '',
              stderr: compilerErr,
              code: statusCode,
              signal: null,
              output: compilerErr
            }
          });
        }

        const combinedOutput = programOut || (programErr ? programErr : compilerErr);
        return NextResponse.json({
          language: 'c',
          version: 'wandbox-gcc',
          run: {
            stdout: programOut,
            stderr: programErr || (statusCode !== 0 ? compilerErr : ''),
            code: statusCode,
            signal: null,
            output: combinedOutput
          }
        });
      }
    } catch (wandboxErr: any) {
      console.warn('[C Runner] Wandbox execution error:', wandboxErr.message);
    }

    // METHOD D: Fallback to JDoodle Cloud API (if configured in environment)
    const jdoodleKeys = [
      { id: process.env.JDOODLE_CLIENT_ID_1, secret: process.env.JDOODLE_CLIENT_SECRET_1 },
      { id: process.env.JDOODLE_CLIENT_ID_2, secret: process.env.JDOODLE_CLIENT_SECRET_2 },
      { id: process.env.JDOODLE_CLIENT_ID_3, secret: process.env.JDOODLE_CLIENT_SECRET_3 },
      { id: process.env.JDOODLE_CLIENT_ID_4, secret: process.env.JDOODLE_CLIENT_SECRET_4 }
    ].filter(k => k.id && k.secret);

    if (jdoodleKeys.length > 0) {
      console.log('[C Runner] Trying JDoodle API...');
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

    // METHOD E: Glot.io Open Code Runner
    try {
      console.log('[C Runner] Trying Glot.io API...');
      const glotController = new AbortController();
      const glotTimeout = setTimeout(() => glotController.abort(), 12000);

      const glotRes = await fetch('https://glot.io/api/run/c/latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{ name: 'main.c', content: code }],
          stdin: stdin || ''
        }),
        signal: glotController.signal
      });
      clearTimeout(glotTimeout);

      if (glotRes.ok) {
        const glotData = await glotRes.json();
        const stdout = glotData.stdout || '';
        const stderr = glotData.stderr || glotData.error || '';
        const isErr = !!glotData.error || (stderr && !stdout);
        return NextResponse.json({
          language: 'c',
          version: 'glot-gcc',
          run: {
            stdout: stdout,
            stderr: stderr,
            code: isErr ? 1 : 0,
            signal: null,
            output: stdout + (stderr ? '\n' + stderr : '')
          }
        });
      }
    } catch (glotErr: any) {
      console.warn('[C Runner] Glot.io execution error:', glotErr.message);
    }

    return NextResponse.json({
      error: 'C Compiler is currently offline. Please check network connectivity or configure local GCC.'
    }, { status: 503 });

  } catch (error: any) {
    if (executionDir) cleanup(executionDir);
    return NextResponse.json({ error: error.message || 'Execution failed' }, { status: 500 });
  }
}
