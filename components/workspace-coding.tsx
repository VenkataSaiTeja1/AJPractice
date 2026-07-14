'use client';

import React, { useState, useEffect } from 'react';
import { Play, Send, RefreshCw, Terminal, CheckCircle2, XCircle, AlertCircle, FileCode, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CodingProps {
  task: any;
  studentId: string;
  onSubmitted: () => void;
}

export default function WorkspaceCoding({ task, studentId, onSubmitted }: CodingProps) {
  const [code, setCode] = useState(task.starter_code || '');
  const [stdin, setStdin] = useState('');
  
  // Execution states
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [consoleError, setConsoleError] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  
  // Grading & Limits states
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [executionCount, setExecutionCount] = useState(0);

  // Line numbers helper
  const [lineNumbers, setLineNumbers] = useState<number[]>([1]);

  useEffect(() => {
    const lines = code.split('\n').length;
    setLineNumbers(Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1));
  }, [code]);

  // Fetch current execution count for this task
  const fetchExecutionCount = async () => {
    try {
      const res = await fetch(`/api/submissions?studentId=${studentId}&taskId=${task.id}&includeRuns=true`);
      if (res.ok) {
        const data = await res.json();
        setExecutionCount(data.length || 0);
      }
    } catch (e) {
      console.error('Failed to load execution count:', e);
    }
  };

  useEffect(() => {
    fetchExecutionCount();
  }, [studentId, task.id]);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the editor to the starter template?')) {
      setCode(task.starter_code || '');
      setConsoleOutput('');
      setConsoleError('');
      setExitCode(null);
      setGradeResult(null);
    }
  };

  const handleRunCode = async () => {
    if (executionCount >= 7) {
      setErrorMessage('Execution limit reached! You are allowed a maximum of 7 executions per coding exercise.');
      return;
    }

    setRunning(true);
    setConsoleOutput('');
    setConsoleError('');
    setExitCode(null);
    setErrorMessage('');

    try {
      // Calls submissions route with isRun flag to execute and log run
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId, 
          taskId: task.id, 
          submittedContent: code, 
          isRun: true, 
          stdin 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Compiler service returned an error.');
      }

      const run = data.run || {};
      setConsoleOutput(run.stdout || '');
      setConsoleError(run.stderr || '');
      setExitCode(run.code);
      
      if (run.stderr) {
        setConsoleError(run.stderr);
      }

      // Re-fetch count
      await fetchExecutionCount();

    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to run Java application.');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (executionCount >= 7) {
      setErrorMessage('Execution limit reached! You are allowed a maximum of 7 executions per coding exercise.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setGradeResult(null);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          taskId: task.id,
          submittedContent: code,
          isRun: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record submission.');
      }
      
      if (data.success) {
        setGradeResult(data.submission);
        
        if (data.submission.status === 'passed') {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
        
        onSubmitted();
        // Re-fetch count
        await fetchExecutionCount();
      } else {
        setErrorMessage(data.error || 'Auto-grading failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const limitReached = executionCount >= 7;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Code Editor Column */}
      <div className="flex flex-col h-[650px] glass-card border-slate-800 overflow-hidden relative">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <FileCode className="h-4.5 w-4.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200 font-mono">Main.java</span>
          </div>
          
          {/* Execution Counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10.5px] font-mono font-medium">
            <span className="text-slate-500">Attempts:</span>
            <span className={limitReached ? 'text-rose-400 font-bold' : executionCount >= 5 ? 'text-amber-400' : 'text-indigo-400'}>
              {executionCount} / 7
            </span>
          </div>

          <button
            onClick={handleReset}
            disabled={limitReached}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Code
          </button>
        </div>

        {/* Custom Text Editor Container */}
        <div className="flex-1 flex overflow-auto font-mono text-sm bg-slate-950/40 py-3 select-text">
          {/* Gutter Line Numbers */}
          <div className="w-11 text-right text-slate-600 pr-3 border-r border-slate-850 select-none text-xs leading-6">
            {lineNumbers.map(n => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={limitReached}
            className="flex-1 pl-3 bg-transparent text-slate-100 font-mono text-xs sm:text-sm leading-6 outline-none border-none resize-none h-full overflow-y-auto whitespace-pre tab-size-4 disabled:cursor-not-allowed"
            style={{ tabSize: 4 }}
            placeholder="// Enter your Java code here"
            spellCheck={false}
          />
        </div>

        {/* Editor Inputs Panel */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            Standard Input (stdin)
          </label>
          <textarea
            placeholder="Type console inputs here..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            disabled={limitReached}
            className="w-full glass-input font-mono text-xs resize-none disabled:cursor-not-allowed"
          />
        </div>

        {/* Editor Bottom Actions */}
        <div className="bg-slate-950/80 px-4 py-3 border-t border-slate-800/80 flex justify-between items-center">
          <button
            onClick={handleRunCode}
            disabled={running || submitting || limitReached}
            className="flex items-center gap-1.5 rounded bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-850 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-3.5 w-3.5 text-indigo-400" />
            {running ? 'Running...' : 'Run Code'}
          </button>
          
          <button
            onClick={handleSubmitCode}
            disabled={running || submitting || limitReached}
            className="flex items-center gap-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 px-5 py-2 text-xs font-bold text-white transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? 'Verifying...' : 'Submit Work'}
          </button>
        </div>
      </div>

      {/* Terminal Output & Results Column */}
      <div className="flex flex-col h-[650px] gap-6">
        
        {/* Terminal Card */}
        <div className="flex-1 glass-card border-slate-800 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80">
            <Terminal className="h-4.5 w-4.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Execution Console</span>
          </div>

          <div className="flex-1 bg-slate-950/60 p-4 font-mono text-xs overflow-y-auto space-y-3">
            {limitReached && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-2.5 text-rose-400">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">Execution Limit Reached</p>
                  <p className="text-[11px] leading-normal font-light">You have executed/submitted this code 7 times. No more runs or submissions are permitted for this exercise.</p>
                </div>
              </div>
            )}
            
            {running ? (
              <div className="flex items-center gap-2 text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Compiling Java source and linking dependencies...</span>
              </div>
            ) : consoleOutput || consoleError || exitCode !== null ? (
              <>
                {consoleOutput && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Standard Output</span>
                    <pre className="text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">{consoleOutput}</pre>
                  </div>
                )}
                {consoleError && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider block">Standard Error</span>
                    <pre className="text-rose-400 font-mono whitespace-pre-wrap leading-relaxed">{consoleError}</pre>
                  </div>
                )}
                {exitCode !== null && (
                  <div className="border-t border-slate-900 pt-2 text-[10px] text-slate-500">
                    Process exited with code <span className={exitCode === 0 ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>{exitCode}</span>
                  </div>
                )}
              </>
            ) : (
              !limitReached && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center font-sans space-y-1.5">
                  <Terminal className="h-8 w-8 text-slate-600" />
                  <p className="text-sm font-semibold">Console Output is empty</p>
                  <p className="text-xs font-light max-w-[250px]">Click &quot;Run Code&quot; to compile and execute your Java code.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Verification Result Card */}
        <div className="h-[220px] glass-card border-slate-800 p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Auto-Grading Outcome</h4>
            
            {errorMessage && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 flex items-start gap-2.5 text-xs text-rose-400">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            {gradeResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {gradeResult.status === 'passed' ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-white">Verification Succeeded</p>
                        <p className="text-[10px] text-slate-400">Score Recorded: {gradeResult.score}/100</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-white">Verification Failed</p>
                        <p className="text-[10px] text-slate-400">Output did not match expected console outputs.</p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Feedback content box */}
                <div className="bg-slate-950/80 border border-slate-900 rounded p-3 text-[11px] font-mono text-slate-300 max-h-[85px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {gradeResult.feedback}
                </div>
              </div>
            ) : (
              !errorMessage && (
                <div className="text-xs text-slate-400 leading-relaxed font-light">
                  Once you submit your program, we will run and compare it against the expected test cases.
                  <br />
                  <span className="font-semibold text-slate-300">Expected console output:</span>
                  <pre className="mt-1.5 p-2 bg-slate-950/60 border border-slate-900 rounded font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre">{task.expected_output || 'Multiple test cases configured.'}</pre>
                </div>
              )
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
