'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizProps {
  task: any;
  studentId: string;
  submissions?: any[];
  onSubmitted: () => void;
}

export default function WorkspaceQuiz({ task, studentId, submissions = [], onSubmitted }: QuizProps) {
  const metadata = task.metadata || {};
  const questions = metadata.questions || [];
  
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

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
    if (result) return; // Prevent changes after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmit = async () => {
    // Validate that all questions are answered
    if (questions.some((q: any) => selectedAnswers[q.id] === undefined)) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setError('');
    setSubmitting(true);

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
            particleCount: 100,
            spread: 70,
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

  return (
    <div className="space-y-6">
      
      {/* Quiz Introduction Banner */}
      <div className="glass-card p-6 border-slate-800 bg-slate-900/10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
          <HelpCircle className="h-5 w-5 text-indigo-400" />
          Interactive Unit Quiz
        </h3>
        <p className="text-sm text-slate-400 font-light leading-relaxed">
          {result 
            ? "You have already completed this quiz. Review your answers below. Correct choices are highlighted in green, incorrect in red."
            : "Read each question carefully. Select the option that best answers the architectural or syntactic problem. You need a score of 60% or higher to pass this task. Note: You can only attempt this quiz once."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 flex items-center gap-2 text-sm text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Questions List */}
      <div className="space-y-6">
        {questions.map((q: any, index: number) => {
          const selectedOption = selectedAnswers[q.id];
          const isCorrect = selectedOption === q.correctOption;

          return (
            <div 
              key={q.id} 
              className={`glass-card p-6 border transition-all duration-200 ${
                result
                  ? isCorrect
                    ? 'border-emerald-500/35 bg-emerald-950/5'
                    : 'border-rose-500/35 bg-rose-950/5'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
                  {index + 1}
                </span>
                <div className="space-y-4 w-full">
                  <h4 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                    {q.question}
                  </h4>
                  
                  {/* Options */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {q.options.map((option: string, optIndex: number) => {
                      const isSelected = selectedOption === optIndex;
                      const isOptionCorrect = q.correctOption === optIndex;
                      
                      let optionStyle = 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/30 text-slate-300';
                      
                      if (result) {
                        if (isSelected && isOptionCorrect) {
                          optionStyle = 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 font-medium';
                        } else if (isSelected && !isOptionCorrect) {
                          optionStyle = 'bg-rose-500/10 border-rose-500/35 text-rose-450';
                        } else if (isOptionCorrect) {
                          optionStyle = 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500/80 font-medium';
                        } else {
                          optionStyle = 'opacity-40 bg-slate-950/40 border-slate-800/80 text-slate-500';
                        }
                      } else if (isSelected) {
                        optionStyle = 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-semibold shadow-md';
                      }

                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optIndex)}
                          disabled={!!result}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex items-center justify-between ${
                            result ? 'cursor-default' : 'cursor-pointer'
                          } ${optionStyle}`}
                        >
                          <span className="flex-1 pr-3">{option}</span>
                          {result && (
                            isSelected && isOptionCorrect ? (
                              <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0 ml-2" />
                            ) : isSelected && !isOptionCorrect ? (
                              <XCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 ml-2" />
                            ) : isOptionCorrect ? (
                              <CheckCircle className="h-4.5 w-4.5 text-emerald-500/60 shrink-0 ml-2" />
                            ) : null
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action panel */}
      <div className="glass-card p-6 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {result ? (
          <div className="space-y-1 w-full">
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold uppercase tracking-wider ${result.status === 'passed' ? 'text-emerald-400' : 'text-rose-405'}`}>
                {result.status === 'passed' ? 'Passed' : 'Failed'}
              </span>
              <span className="text-sm font-semibold text-slate-350">Quiz Score: {result.score}%</span>
            </div>
            <p className="text-xs text-slate-400 font-light mt-1">Quiz submitted. Re-attempts are restricted for mandatory assessments.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 font-light max-w-sm">
              Verify that you have answered all questions. Your responses will be saved to your grade profile.
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-sm font-bold text-white transition-all shadow-md glow-hover cursor-pointer"
            >
              {submitting ? 'Evaluating...' : 'Submit Answers'}
            </button>
          </>
        )}
      </div>

    </div>
  );
}
