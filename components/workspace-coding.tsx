'use client';

import React, { useState, useEffect } from 'react';
import { Play, Send, RefreshCw, Terminal, CheckCircle2, XCircle, AlertCircle, FileCode, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

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
  const [rollNumber, setRollNumber] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    const fetchStudentRoll = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('roll_number')
          .eq('id', studentId)
          .single();
        if (!error && data) {
          setRollNumber(data.roll_number || '');
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (studentId) {
      fetchStudentRoll();
    }
  }, [studentId]);

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
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => {
        setResetConfirm(false);
      }, 4000);
      return;
    }
    setCode(task.starter_code || '');
    setConsoleOutput('');
    setConsoleError('');
    setExitCode(null);
    setGradeResult(null);
    setResetConfirm(false);
  };

  const handleRunCode = async () => {
    setRunning(true);
    setConsoleOutput('');
    setConsoleError('');
    setExitCode(null);
    setErrorMessage('');

    try {
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

      await fetchExecutionCount();

    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to run Java application.');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
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

  const limitReached = false;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
      
      {/* Code Editor Column */}
      <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative h-[650px] w-full lg:w-1/2 lg:min-w-[30%] lg:max-w-[70%] lg:resize-x">
        
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <FileCode className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-slate-800 font-mono">Main.java</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Execution Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono font-medium shadow-xs">
              <span className="text-slate-400">Runs:</span>
              <span className="text-indigo-600 font-bold">{executionCount}</span>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              disabled={limitReached}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                resetConfirm 
                  ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white'
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${resetConfirm ? 'animate-spin' : ''}`} />
              {resetConfirm ? 'Confirm Reset?' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Custom Text Editor Container */}
        <div className="flex-1 flex overflow-auto font-mono text-sm bg-slate-50/40 select-text min-h-0 relative">
          {/* Anti-OCR / Google Lens Roll Number Watermark Overlay */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-wrap gap-x-14 gap-y-16 items-center justify-center p-8 opacity-[0.03]">
            {Array.from({ length: 28 }).map((_, i) => (
              <div 
                key={i} 
                className="text-slate-900 font-extrabold text-[13px] tracking-widest font-mono rotate-[-25deg] uppercase whitespace-nowrap"
              >
                {rollNumber || "STUDENT"}
              </div>
            ))}
          </div>

          {/* Gutter Line Numbers */}
          <div className="w-12 text-right text-slate-400 pr-3 pt-3 border-r border-slate-200 bg-slate-100/50 select-none text-xs leading-6 relative z-10 shrink-0">
            {lineNumbers.map(n => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              alert("Malpractice Protection: Pasting code is strictly disabled. You must type your solution manually.");
            }}
            onCopy={(e) => {
              e.preventDefault();
              alert("Malpractice Protection: Copying code from the sandbox is disabled.");
            }}
            onCut={(e) => {
              e.preventDefault();
              alert("Malpractice Protection: Cutting code is disabled.");
            }}
            onContextMenu={(e) => {
              e.preventDefault();
            }}
            disabled={limitReached}
            className="flex-1 p-3 bg-transparent text-slate-800 font-mono text-xs sm:text-sm leading-6 outline-none border-none resize-none h-full overflow-y-auto whitespace-pre tab-size-4 disabled:cursor-not-allowed relative z-10"
            style={{ tabSize: 4 }}
            placeholder="// Enter your Java code here"
            spellCheck={false}
          />
        </div>

        {/* Editor Inputs Panel */}
        <div className="border-t border-slate-200 bg-white p-3.5 space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Standard Input (stdin)
          </label>
          <textarea
            placeholder="Type console inputs here (one per line)..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            disabled={limitReached}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none disabled:cursor-not-allowed"
          />
        </div>

        {/* Editor Bottom Actions */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={handleRunCode}
            disabled={running || submitting || limitReached}
            className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
            {running ? 'Compiling & Running...' : 'Run Code'}
          </button>
          
          <button
            onClick={handleSubmitCode}
            disabled={running || submitting || limitReached}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 px-5 py-2 text-xs font-bold text-white transition-all shadow-sm shadow-indigo-200 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? 'Verifying...' : 'Submit Program'}
          </button>
        </div>
      </div>

      {/* Terminal Output & Results Column */}
      <div className="flex flex-col gap-6 flex-1 h-[650px] min-w-0">
        
        {/* Terminal Card */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Execution Output</span>
            </div>
            {exitCode !== null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                exitCode === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                Exit Code: {exitCode}
              </span>
            )}
          </div>

          <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-3 min-h-0 text-slate-100">
            {limitReached && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-2.5 text-rose-400">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">Execution Limit Reached</p>
                  <p className="text-[11px] leading-normal font-light">You have reached the maximum allowed executions for this task.</p>
                </div>
              </div>
            )}
            
            {running ? (
              <div className="flex items-center gap-2.5 text-indigo-300 py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Compiling Java source and running executable...</span>
              </div>
            ) : consoleOutput || consoleError || exitCode !== null ? (
              <>
                {consoleOutput && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Standard Output:</span>
                    <pre className="text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">{consoleOutput}</pre>
                  </div>
                )}
                {consoleError && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider block">Standard Error:</span>
                    <pre className="text-rose-400 font-mono whitespace-pre-wrap leading-relaxed">{consoleError}</pre>
                  </div>
                )}
              </>
            ) : (
              !limitReached && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center font-sans space-y-2 py-8">
                  <Terminal className="h-8 w-8 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">Console is idle</p>
                  <p className="text-[11px] text-slate-500 max-w-[240px]">Click &quot;Run Code&quot; to compile and view execution output.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Verification Result Card */}
        <div className="h-[230px] bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between shrink-0">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Auto-Grading Outcome</h4>
            
            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <p>{errorMessage}</p>
              </div>
            )}

            {gradeResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {gradeResult.status === 'passed' ? (
                    <>
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Verification Passed</p>
                        <p className="text-xs text-emerald-600 font-semibold">Score Awarded: {gradeResult.score} / 100</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                        <XCircle className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Verification Failed</p>
                        <p className="text-xs text-rose-600 font-semibold">Test cases did not match expectations.</p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Feedback content box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-700 max-h-[90px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {gradeResult.feedback}
                </div>
              </div>
            ) : (
              !errorMessage && (
                <div className="text-xs text-slate-500 leading-relaxed font-light">
                  When you click &quot;Submit Program&quot;, your code is graded against all test cases.
                  <span className="font-semibold text-slate-700 block mt-1.5 mb-1">Expected Test Cases:</span>
                  {task.metadata?.testCases && task.metadata.testCases.filter((tc: any) => !tc.isHidden).length > 0 ? (
                    <div className="space-y-1.5 mt-1 max-h-[110px] overflow-y-auto pr-1">
                      {task.metadata.testCases
                        .filter((tc: any) => !tc.isHidden)
                        .map((tc: any, index: number) => (
                          <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10.5px] font-mono space-y-0.5">
                            <span className="text-[9px] font-bold text-indigo-600 uppercase block">Test Case #{index + 1}</span>
                            {tc.input && (
                              <div className="text-slate-600">
                                <span>Input: </span><code className="text-slate-800 bg-white px-1 py-0.2 rounded border border-slate-200">{tc.input}</code>
                              </div>
                            )}
                            <div className="text-slate-600">
                              <span>Expected: </span><code className="text-emerald-700 font-semibold bg-white px-1 py-0.2 rounded border border-slate-200">{tc.expected}</code>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <pre className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10.5px] text-slate-600 overflow-x-auto whitespace-pre">
                      {task.expected_output || (task.metadata?.testCases?.length > 0 ? 'Multiple test cases configured (outputs hidden).' : 'Compiles and runs with standard Java output.')}
                    </pre>
                  )}
                </div>
              )
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
