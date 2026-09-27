'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Send, RefreshCw, Terminal, CheckCircle2, XCircle, AlertCircle, FileCode, ShieldAlert, Code2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

interface CodingProps {
  task: any;
  studentId: string;
  onSubmitted: () => void;
}

const CODING_SYMBOLS = [
  '{', '}', '(', ')', '<', '>', ';', '[', ']', '&', '*', '=', '!', '"', "'", '\\', '->', 'Tab'
];

export default function WorkspaceCoding({ task, studentId, onSubmitted }: CodingProps) {
  const isCLanguage = task.metadata?.language === 'c' || task.year === 1;
  const fileName = isCLanguage ? 'main.c' : 'Main.java';

  const defaultStarter = isCLanguage
    ? (task.starter_code || '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Write your C & DS program here\n    printf("Hello, World!\\n");\n    return 0;\n}')
    : (task.starter_code || 'public class Main {\n    public static void main(String[] args) {\n        // Write your Java code here\n        System.out.println("Hello, World!");\n    }\n}');

  const [code, setCode] = useState(defaultStarter);
  const [stdin, setStdin] = useState('');
  const [mobileTab, setMobileTab] = useState<'editor' | 'terminal'>('editor');
  
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = code.split('\n').length;
    setLineNumbers(Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1));
  }, [code]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

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

  const insertSymbol = (sym: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    
    let toInsert = sym;
    if (sym === 'Tab') toInsert = '    ';
    
    const newVal = currentVal.substring(0, start) + toInsert + currentVal.substring(end);
    setCode(newVal);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + toInsert.length, start + toInsert.length);
    }, 0);
  };

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => {
        setResetConfirm(false);
      }, 4000);
      return;
    }
    setCode(defaultStarter);
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

    // On mobile, switch to terminal tab so student sees output immediately
    if (window.innerWidth < 1024) {
      setMobileTab('terminal');
    }

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
      setErrorMessage(err.message || `Failed to execute ${isCLanguage ? 'C' : 'Java'} application.`);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    setSubmitting(true);
    setErrorMessage('');
    setGradeResult(null);

    // On mobile, switch to terminal tab so student sees evaluation outcome
    if (window.innerWidth < 1024) {
      setMobileTab('terminal');
    }

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
    <div className="flex flex-col gap-4 w-full">

      {/* Mobile Tab Switcher (Visible on small & tablet screens < lg) */}
      <div className="flex lg:hidden rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'editor'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileCode className="h-3.5 w-3.5" /> Code Editor ({fileName})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('terminal')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'terminal'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" /> Console & Result {running && '⏳'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
        
        {/* Code Editor Column */}
        <div className={`flex h-[72vh] max-h-[820px] min-h-[560px] flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative w-full lg:w-1/2 lg:min-w-[30%] lg:max-w-[70%] lg:resize-x ${
          mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Editor Toolbar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
                <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate max-w-[100px] sm:max-w-none">{fileName}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                {isCLanguage ? 'C (GCC)' : 'Java 17'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Execution Counter */}
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-medium shadow-xs">
                <span className="text-slate-500 dark:text-slate-400">Runs:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{executionCount}</span>
              </div>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                disabled={limitReached}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  resetConfirm 
                    ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${resetConfirm ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{resetConfirm ? 'Confirm Reset?' : 'Reset'}</span>
              </button>
            </div>
          </div>

          {/* Quick Coding Symbols Ribbon (Pinned above editor for frictionless Mobile & Laptop typing) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-x-auto select-none no-scrollbar w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Code2 className="h-3 w-3 text-indigo-500" />
              Keys:
            </span>
            {CODING_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => insertSymbol(sym)}
                className="h-7 min-w-[28px] px-2 rounded-md bg-white dark:bg-slate-850 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 shadow-2xs hover:border-indigo-400 hover:text-indigo-600 transition-all shrink-0 active:scale-95 cursor-pointer"
                title={`Insert ${sym}`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Custom Text Editor Container */}
          <div className="flex-1 flex font-mono text-sm bg-slate-50/40 dark:bg-slate-950/40 select-text min-h-0 relative w-full overflow-hidden">
            {/* Anti-OCR / Google Lens Roll Number Watermark Overlay */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-wrap gap-x-14 gap-y-16 items-center justify-center p-8 opacity-[0.03] dark:opacity-[0.05]">
              {Array.from({ length: 28 }).map((_, i) => (
                <div 
                  key={i} 
                  className="text-slate-900 dark:text-slate-100 font-extrabold text-[13px] tracking-widest font-mono rotate-[-25deg] uppercase whitespace-nowrap"
                >
                  {rollNumber || "STUDENT"}
                </div>
              ))}
            </div>

            {/* Gutter Line Numbers */}
            <div 
              ref={gutterRef}
              className="w-10 sm:w-12 text-right text-slate-500 dark:text-slate-400 pr-2.5 pt-3 border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 select-none text-xs sm:text-sm leading-6 relative z-10 shrink-0 overflow-hidden"
            >
              {lineNumbers.map(n => (
                <div key={n}>{n}</div>
              ))}
            </div>

            {/* Text Area */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
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
              className="flex-1 min-w-0 w-full h-full p-3 bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm leading-6 outline-none border-none resize-none overflow-auto whitespace-pre tab-size-4 disabled:cursor-not-allowed relative z-10"
              style={{ tabSize: 4 }}
              placeholder={isCLanguage ? "// Enter your C code here..." : "// Enter your Java code here..."}
              spellCheck={false}
            />
          </div>

          {/* Editor Inputs Panel */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Standard Input (stdin for scanf / read)
            </label>
            <textarea
              placeholder="Enter inputs here (one per line)..."
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={2}
              disabled={limitReached}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 font-mono text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none disabled:cursor-not-allowed"
            />
          </div>

          {/* Editor Bottom Actions */}
          <div className="bg-slate-50 dark:bg-slate-950/80 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={handleRunCode}
              disabled={running || submitting || limitReached}
              className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 hover:border-slate-400 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
              {running ? 'Compiling & Running...' : 'Run Code'}
            </button>
            
            <button
              onClick={handleSubmitCode}
              disabled={running || submitting || limitReached}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-5 py-2 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/25 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Verifying...' : 'Submit Program'}
            </button>
          </div>
        </div>

        {/* Terminal Output & Results Column */}
        <div className={`flex flex-col gap-5 flex-1 min-h-[500px] sm:min-h-[650px] min-w-0 ${
          mobileTab === 'terminal' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Terminal Card */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-slate-500 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Execution Output</span>
              </div>
              {exitCode !== null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  exitCode === 0 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                }`}>
                  Exit Code: {exitCode}
                </span>
              )}
            </div>

            <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-3 min-h-[240px] text-slate-100">
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
                <div className="flex items-center gap-2.5 text-indigo-300 py-6">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  <span>Compiling {isCLanguage ? 'C' : 'Java'} source and running binary...</span>
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
          <div className="min-h-[220px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col justify-between shrink-0">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Auto-Grading Outcome</h4>
              
              {errorMessage && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {gradeResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {gradeResult.status === 'passed' ? (
                      <>
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Verification Passed</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Score: {gradeResult.score} / 100</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
                          <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Verification Failed</p>
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Test cases did not match expectations.</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Feedback content box */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-700 dark:text-slate-300 max-h-[90px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {gradeResult.feedback}
                  </div>
                </div>
              ) : (
                !errorMessage && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    When you click &quot;Submit Program&quot;, your code is graded against all test cases.
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block mt-1 mb-1">Expected Test Cases:</span>
                    {task.metadata?.testCases && task.metadata.testCases.filter((tc: any) => !tc.isHidden).length > 0 ? (
                      <div className="space-y-1.5 mt-1 max-h-[100px] overflow-y-auto pr-1">
                        {task.metadata.testCases
                          .filter((tc: any) => !tc.isHidden)
                          .map((tc: any, index: number) => (
                            <div key={index} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-[10.5px] font-mono space-y-0.5">
                              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block">Test Case #{index + 1}</span>
                              {tc.input && (
                                <div className="text-slate-600 dark:text-slate-400">
                                  <span>Input: </span><code className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-800">{tc.input}</code>
                                </div>
                              )}
                              <div className="text-slate-600 dark:text-slate-400">
                                <span>Expected: </span><code className="text-emerald-700 dark:text-emerald-400 font-semibold bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-800">{tc.expected}</code>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <pre className="mt-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-[10.5px] text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre">
                        {task.expected_output || (task.metadata?.testCases?.length > 0 ? 'Multiple test cases configured (outputs hidden).' : 'Compiles and runs with standard console output.')}
                      </pre>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
