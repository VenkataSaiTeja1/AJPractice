'use client';

import React, { useState, useEffect } from 'react';
import { Server, ExternalLink, Send, CheckCircle, Clock, AlertCircle, Bookmark } from 'lucide-react';

interface CloudLabProps {
  task: any;
  studentId: string;
  onSubmitted: () => void;
}

export default function WorkspaceCloudLab({ task, studentId, onSubmitted }: CloudLabProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Previous submissions state
  const [previousSub, setPreviousSub] = useState<any>(null);

  const fetchPreviousSub = async () => {
    try {
      const res = await fetch(`/api/submissions?studentId=${studentId}&taskId=${task.id}`);
      if (res.ok) {
        const subs = await res.json();
        if (subs && subs.length > 0) {
          setPreviousSub(subs[0]);
          setRepoUrl(subs[0].submitted_content);
        }
      }
    } catch (err) {
      console.error('Error fetching previous submissions:', err);
    }
  };

  useEffect(() => {
    fetchPreviousSub();
  }, [studentId, task.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!repoUrl.trim()) {
      setError('Please provide a valid GitHub repository or deployment URL.');
      return;
    }

    if (!repoUrl.toLowerCase().startsWith('http://') && !repoUrl.toLowerCase().startsWith('https://')) {
      setError('URLs must start with http:// or https://');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          taskId: task.id,
          submittedContent: repoUrl.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record submission.');
      }

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        fetchPreviousSub();
        onSubmitted();
      } else {
        setError(data.error || 'Failed to register submission.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during repository submission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cloud IDE Guide Box */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Server className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Cloud Web Container Environment
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed font-normal">
            This unit assignment requires running a Tomcat web container or a Java Servlet/Spring environment. Launch the pre-configured cloud container to edit, build, and run servlet mappings with zero local setup.
          </p>
        </div>
        <div className="flex justify-start md:justify-end">
          <a
            href={task.cloud_ide_url || 'https://github.com/codespaces/new?repo=github/codespaces-blank'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer w-full md:w-auto text-center justify-center active:scale-[0.98]"
          >
            Launch Cloud IDE
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Submission Feedback Messages */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-sm text-emerald-700">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>Repository submitted successfully. The teaching faculty will review your assignment shortly!</span>
        </div>
      )}

      {/* Submission Card & Repository Form */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Repo submit form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Repository Submission</h4>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">GitHub Repository / Live Deployment Link</label>
              <input
                type="text"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Make sure your repository has public visibility and contains the complete project structure (e.g. `web.xml`, servlets, or Spring Boot controllers).
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 py-3 text-sm font-bold text-white transition-all shadow-md shadow-indigo-200 cursor-pointer active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting Link...' : 'Submit Repository Link'}
          </button>
        </form>

        {/* Grade Status Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Grading & Review</h4>
            {previousSub ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {previousSub.status === 'passed' ? (
                    <>
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Lab Approved</p>
                        <p className="text-xs text-emerald-600 font-semibold">Score: {previousSub.score} / 100</p>
                      </div>
                    </>
                  ) : previousSub.status === 'failed' ? (
                    <>
                      <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Revision Requested</p>
                        <p className="text-xs text-rose-600">Please review feedback and resubmit</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Awaiting Faculty Review</p>
                        <p className="text-xs text-slate-500">Submitted on: {new Date(previousSub.submitted_at).toLocaleDateString()}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Teacher Feedback</span>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono text-slate-700 max-h-[95px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {previousSub.feedback || 'No feedback left yet. Wait for faculty evaluation.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8 text-slate-500 space-y-2">
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Bookmark className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No Submissions Yet</p>
                <p className="text-[11px] text-slate-400 max-w-[200px]">Once you submit a repository URL, it will show up here for faculty review.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
