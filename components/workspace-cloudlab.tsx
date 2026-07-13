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
          setPreviousSub(subs[0]); // Get the latest submission
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
      setError('Please provide a valid GitHub repository or deploy URL.');
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
      <div className="glass-card p-6 border-slate-800 bg-slate-900/10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-400" />
            Tomcat Web Container Environment
          </h3>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            This unit assignment requires running an Apache Tomcat web container or a Java Servlet/Spring environment. Click the button to launch a pre-configured, free cloud container where you can edit, build, and run servlet mappings.
          </p>
        </div>
        <div className="flex justify-start md:justify-end">
          <a
            href={task.cloud_ide_url || 'https://github.com/codespaces/new?repo=github/codespaces-blank'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 text-sm font-bold shadow-lg transition-all glow-hover cursor-pointer w-full md:w-auto text-center justify-center"
          >
            Launch in Free Cloud IDE
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Submission Feedback Messages */}
      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 flex items-center gap-2 text-sm text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>Repository submitted successfully. The teaching assistant will grade your assignment shortly!</span>
        </div>
      )}

      {/* Submission Card & Repository Form */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Repo submit form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 glass-card p-6 border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Repository Submission</h4>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">GitHub Repository / Deploy Preview Link</label>
              <input
                type="text"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full glass-input text-sm"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Make sure your repository has public visibility and contains the complete servlet structure, `web.xml` deployment descriptor, or Spring config controllers.
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 py-3 text-sm font-bold text-white transition-all shadow-md cursor-pointer"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting Link...' : 'Submit Repository Link'}
          </button>
        </form>

        {/* Grade Status Panel */}
        <div className="lg:col-span-2 glass-card p-6 border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Grading & Review</h4>
            {previousSub ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  {previousSub.status === 'passed' ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">Lab Approved</p>
                        <p className="text-[10px] text-slate-400">Score: {previousSub.score}/100</p>
                      </div>
                    </>
                  ) : previousSub.status === 'failed' ? (
                    <>
                      <AlertCircle className="h-6 w-6 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">Lab Rejected</p>
                        <p className="text-[10px] text-slate-400">Revision requested by teacher</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="h-6 w-6 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">Awaiting Assessment</p>
                        <p className="text-[10px] text-slate-400">Submitted on: {new Date(previousSub.submitted_at).toLocaleDateString()}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-900 pt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teacher Feedback</span>
                  <div className="bg-slate-950/80 p-3 rounded text-[11px] font-mono text-slate-400 max-h-[85px] overflow-y-auto whitespace-pre-wrap">
                    {previousSub.feedback || 'No feedback left yet. Wait for the teaching assistant.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 text-slate-500 space-y-1.5">
                <Bookmark className="h-8 w-8 text-slate-700" />
                <p className="text-xs font-semibold">No Submissions Yet</p>
                <p className="text-[10.5px] font-light max-w-[200px]">Once you submit a repository URL, it will show up here as pending manual grading.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
