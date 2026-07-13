import { NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Helper to check if a CLI command is available on the system
function isCommandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`${command} -version`, (error) => {
      resolve(!error);
    });
  });
}

export async function POST(req: Request) {
  let executionDir = '';
  try {
    const { code, stdin = '' } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code content is required' }, { status: 400 });
    }

    // Check if Java compiler (javac) is installed locally on the hosting environment
    const localJavaAvailable = await isCommandAvailable('javac');

    if (localJavaAvailable) {
      // METHOD A: Execute locally on the hosting server/PC using local JDK
      const runId = crypto.randomUUID();
      executionDir = path.join(process.cwd(), '.temp_runs', runId);
      fs.mkdirSync(executionDir, { recursive: true });

      const sourceFilePath = path.join(executionDir, 'Main.java');
      fs.writeFileSync(sourceFilePath, code);

      // Compile
      const compileResult = await new Promise<{ code: number; stderr: string }>((resolve) => {
        exec('javac Main.java', { cwd: executionDir, timeout: 5000 }, (error, stdout, stderr) => {
          if (error) {
            resolve({ 
              code: error.code || 1, 
              stderr: stderr || error.message || 'Compilation failed.' 
            });
          } else {
            resolve({ code: 0, stderr: '' });
          }
        });
      });

      if (compileResult.code !== 0) {
        cleanup(executionDir);
        return NextResponse.json({
          language: 'java',
          version: 'local-jdk',
          run: {
            stdout: '',
            stderr: compileResult.stderr,
            code: compileResult.code,
            signal: null,
            output: compileResult.stderr
          }
        });
      }

      // Execute
      const runResult = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
        const child = spawn('java', ['Main'], { cwd: executionDir });

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

        const timeoutId = setTimeout(() => {
          child.kill('SIGKILL');
        }, 6000);

        child.on('close', (exitCode) => {
          clearTimeout(timeoutId);
          resolve({
            stdout: stdoutData,
            stderr: stderrData,
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
        language: 'java',
        version: 'local-jdk',
        run: {
          stdout: runResult.stdout,
          stderr: runResult.stderr,
          code: runResult.code === null ? 124 : runResult.code,
          signal: runResult.code === null ? 'SIGKILL' : null,
          output: runResult.stdout + runResult.stderr
        }
      });

    } else {
      // METHOD B: Execute via Piston API fallback (for serverless environments like Vercel with no JDK)
      // Checks for custom self-hosted Piston URL, or defaults to the public Piston instance
      const pistonUrl = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute';

      // Resolve Java version
      let javaVersion = '15.0.2';
      try {
        const runtimesRes = await fetch(pistonUrl.replace('/execute', '/runtimes'));
        if (runtimesRes.ok) {
          const runtimes = await runtimesRes.json();
          const javaRuntime = runtimes.find((r: any) => r.language === 'java' || (r.aliases && r.aliases.includes('java')));
          if (javaRuntime && javaRuntime.version) {
            javaVersion = javaRuntime.version;
          }
        }
      } catch (err) {
        console.warn('Failed to detect remote runtime version, using default:', err);
      }

      const response = await fetch(pistonUrl, {
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
        return NextResponse.json({ 
          error: `Compiler Service Error: ${errorMsg}. Please verify Piston whitelist configurations or host server environment JDK.` 
        }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

  } catch (error: any) {
    if (executionDir) cleanup(executionDir);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

function cleanup(dirPath: string) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (e) {
    console.error(`Failed to clean up path: ${dirPath}`, e);
  }
}
