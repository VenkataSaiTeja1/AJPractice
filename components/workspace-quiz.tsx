'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HelpCircle, AlertCircle, CheckCircle, XCircle, ChevronRight, ChevronLeft, Send, Trophy, Target, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

interface QuizProps {
  task: any;
  studentId: string;
  submissions?: any[];
  onSubmitted: () => void;
}

// Deterministic shuffle using a seed derived from studentId
function seededShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  // Simple LCG PRNG seeded from the hash
  let rng = Math.abs(hash) || 1;
  const nextRandom = () => {
    rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
    return rng / 0x7fffffff;
  };
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function WorkspaceQuiz({ task, studentId, submissions = [], onSubmitted }: QuizProps) {
  const metadata = task.metadata || {};
  const questions = metadata.questions || [];
  
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Shuffle questions deterministically per student
  const shuffledQuestions = useMemo(
    () => seededShuffle(questions, studentId),
    [questions, studentId]
  );

  // Fetch student roll number for anti-OCR watermark overlay
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

  // Load previous submission if it exists
  useEffect(() => {
    const previousSubmission = submissions.length > 0 ? submissions[0] : null;
    if (previousSubmission) {
      try {
        const answers = JSON.parse(previousSubmission.submitted_content);
        setSelectedAnswers(answers);
        setResult(previousSubmission);
      } catch (e) {
        console.error('Failed to parse previous answers:', e);
      }
    }
  }, [submissions]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (result) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const answeredCount = shuffledQuestions.filter((q: any) => selectedAnswers[q.id] !== undefined).length;
  const totalCount = shuffledQuestions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const handleSubmit = async () => {
    if (shuffledQuestions.some((q: any) => selectedAnswers[q.id] === undefined)) {
      setError('Please answer all questions before submitting.');
      setShowConfirmSubmit(false);
      return;
    }

    setError('');
    setSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          taskId: task.id,
          submittedContent: JSON.stringify(selectedAnswers)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quiz.');
      }
      
      if (data.success) {
        setResult(data.submission);
        if (data.submission.status === 'passed') {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
        onSubmitted();
      } else {
        setError(data.error || 'Submission grading failed.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ: any = shuffledQuestions[currentIndex];

  const goNext = () => {
    if (currentIndex < totalCount - 1) setCurrentIndex(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div 
      className="space-y-5 select-none"
      onCopy={(e) => {
        e.preventDefault();
        alert("Malpractice Protection: Copying quiz questions or content is strictly disabled.");
      }}
      onCut={(e) => {
        e.preventDefault();
      }}
      onPaste={(e) => {
        e.preventDefault();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      
      {/* Quiz Header — Progress + Status */}
      <div className="glass-card p-5 border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {result ? 'Quiz Results' : 'Interactive Assessment'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {result 
                  ? "Review your answers below. Correct answers are highlighted."
                  : `${totalCount} questions · Answer all to submit · 60% to pass`}
              </p>
            </div>
          </div>

          {/* Progress Pill */}
          {!result && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950/60 rounded-full px-4 py-2 border border-slate-800">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-300">
                  {answeredCount}<span className="text-slate-500">/{totalCount}</span>
                </span>
                <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Result Badge */}
          {result && (
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border ${
              result.status === 'passed'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}>
              {result.status === 'passed' ? (
                <><Trophy className="h-4 w-4" /> Passed — {result.score}%</>
              ) : (
                <><XCircle className="h-4 w-4" /> Failed — {result.score}%</>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center gap-3 text-sm text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Question Navigation Dots */}
      {!result && (
        <div className="glass-card px-5 py-3 border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {shuffledQuestions.map((_: any, idx: number) => {
              const isAnswered = selectedAnswers[(shuffledQuestions[idx] as any).id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-8 w-8 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer border ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md scale-110'
                      : isAnswered
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-slate-950/40 text-slate-500 border-slate-800 hover:bg-slate-900/60 hover:text-slate-300'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Cards — Show current question if not submitted, or all if result */}
      {result ? (
        /* REVIEW MODE: Show all questions */
        <div className="space-y-4">
          {shuffledQuestions.map((q: any, index: number) => {
            const selectedOption = selectedAnswers[q.id];
            const isCorrect = selectedOption === q.correctOption;
            return (
              <div 
                key={q.id} 
                className={`glass-card p-5 border transition-all duration-300 relative overflow-hidden ${
                  isCorrect
                    ? 'border-emerald-500/30 bg-emerald-50/30'
                    : 'border-rose-500/30 bg-rose-50/30'
                }`}
              >
                {/* Anti-OCR Watermark */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-wrap gap-x-14 gap-y-10 items-center justify-center p-4 opacity-[0.025]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="text-slate-500 font-extrabold text-[11px] tracking-widest font-mono rotate-[-25deg] uppercase whitespace-nowrap"
                    >
                      {rollNumber || "STUDENT"}
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-4 relative z-10">
                  <div className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-xs font-bold ${
                    isCorrect
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="space-y-3 w-full">
                    <h4 className="text-sm font-semibold text-white leading-relaxed">
                      {q.question}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((option: string, optIndex: number) => {
                        const isSelected = selectedOption === optIndex;
                        const isOptionCorrect = q.correctOption === optIndex;
                        
                        let optionStyle = 'opacity-50 bg-slate-950/30 border-slate-800/60 text-slate-500';
                        if (isSelected && isOptionCorrect) {
                          optionStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-medium';
                        } else if (isSelected && !isOptionCorrect) {
                          optionStyle = 'bg-rose-500/10 border-rose-500/40 text-rose-400';
                        } else if (isOptionCorrect) {
                          optionStyle = 'bg-emerald-500/5 border-emerald-500/25 text-emerald-500/80 font-medium';
                        }

                        return (
                          <div
                            key={optIndex}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all ${optionStyle}`}
                          >
                            <span className={`h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-[10px] font-bold border ${
                              isSelected && isOptionCorrect ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                              isSelected && !isOptionCorrect ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' :
                              isOptionCorrect ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                              'bg-slate-950/40 border-slate-800 text-slate-500'
                            }`}>
                              {OPTION_LABELS[optIndex]}
                            </span>
                            <span className="flex-1">{option}</span>
                            {isSelected && isOptionCorrect && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
                            {isSelected && !isOptionCorrect && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                            {!isSelected && isOptionCorrect && <CheckCircle className="h-4 w-4 text-emerald-500/50 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ACTIVE QUIZ MODE: Show one question at a time */
        currentQ && (
          <div className="glass-card p-6 sm:p-8 border-slate-800 relative overflow-hidden min-h-[340px] flex flex-col">
            
            {/* Anti-OCR Watermark */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-wrap gap-x-16 gap-y-12 items-center justify-center p-6 opacity-[0.025]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div 
                  key={i} 
                  className="text-slate-500 font-extrabold text-[13px] tracking-widest font-mono rotate-[-25deg] uppercase whitespace-nowrap"
                >
                  {rollNumber || "STUDENT"}
                </div>
              ))}
            </div>

            {/* Question Number + Text */}
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">
                  {currentIndex + 1}
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Question {currentIndex + 1} of {totalCount}
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-semibold text-white leading-relaxed mb-6">
                {currentQ.question}
              </h4>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((option: string, optIndex: number) => {
                  const isSelected = selectedAnswers[currentQ.id] === optIndex;
                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, optIndex)}
                      className={`group w-full text-left flex items-center gap-4 px-5 py-3.5 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-500 shadow-md'
                          : 'bg-slate-950/30 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/40 hover:text-slate-200'
                      }`}
                    >
                      <span className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500 group-hover:border-slate-700 group-hover:text-slate-400'
                      }`}>
                        {OPTION_LABELS[optIndex]}
                      </span>
                      <span className="flex-1 font-medium">{option}</span>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <CheckCircle className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="relative z-10 flex items-center justify-between mt-6 pt-5 border-t border-slate-800/60">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-900/40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-2">
                {currentIndex === totalCount - 1 && answeredCount === totalCount && !showConfirmSubmit && (
                  <button
                    onClick={() => setShowConfirmSubmit(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg cursor-pointer glow-hover"
                  >
                    <Send className="h-3.5 w-3.5" /> Submit Quiz
                  </button>
                )}
              </div>

              <button
                onClick={goNext}
                disabled={currentIndex === totalCount - 1}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-900/40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Confirm Submit Modal Overlay */}
      {showConfirmSubmit && !result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="glass-card p-6 sm:p-8 border-indigo-500/20 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Submit Quiz?</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Questions answered</span>
                <span className="font-semibold text-white">{answeredCount} / {totalCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Passing threshold</span>
                <span className="font-semibold text-indigo-400">60%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Re-attempts allowed</span>
                <span className="font-semibold text-rose-400">None</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
              >
                {submitting ? (
                  <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating...</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Confirm Submit</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Bar (only when viewing all questions / result) */}
      {result && (
        <div className={`glass-card p-5 border transition-all ${
          result.status === 'passed' ? 'border-emerald-500/20' : 'border-rose-500/20'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {result.status === 'passed' ? (
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-emerald-400" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-rose-400" />
                </div>
              )}
              <div>
                <span className={`text-sm font-bold ${result.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.status === 'passed' ? 'Assessment Passed' : 'Assessment Failed'}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Final Score: <span className="font-semibold text-white">{result.score}%</span> · Re-attempts are restricted.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
