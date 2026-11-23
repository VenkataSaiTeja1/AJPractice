'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, X, Send, Sparkles, AlertCircle, CheckCircle2, 
  HelpCircle, ChevronDown, RefreshCw, Code2, ArrowRight
} from 'lucide-react';

interface AiTutorDrawerProps {
  currentCode?: string;
  errorOutput?: string;
  testFailures?: { input?: string; expected?: string; actual?: string }[];
  triggerExplanation?: boolean;
  onExplanationConsumed?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  provider?: string;
  errorType?: string;
  timestamp: string;
}

export default function AiTutorDrawer({
  currentCode = '',
  errorOutput = '',
  testFailures = [],
  triggerExplanation = false,
  onExplanationConsumed
}: AiTutorDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'tutor',
      text: "👋 Hi! I'm your **C & Data Structures AI Tutor**. Ask me any doubt about pointers, memory, loops, or click **\"Explain Error\"** if your code is failing!",
      timestamp: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle external trigger (e.g. student clicks "Explain Error with AI" in workspace)
  useEffect(() => {
    if (triggerExplanation) {
      setIsOpen(true);
      sendAnalysisRequest('Explain why my code is failing and guide me on how to fix it.');
      if (onExplanationConsumed) {
        onExplanationConsumed();
      }
    }
  }, [triggerExplanation]);

  const sendAnalysisRequest = async (question: string) => {
    if (isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/code-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          errorOutput,
          testFailures,
          question,
          chatHistory: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });

      const data = await res.json();
      const tutorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'tutor',
        text: data.reply || 'Here is the analysis of your program.',
        provider: data.provider,
        errorType: data.ruleAnalysis?.hasMatch ? data.ruleAnalysis.errorType : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, tutorMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'tutor',
          text: '⚠️ Could not reach the AI Tutor service. Please check your loop conditions and pointer accesses.',
          timestamp: 'Just now'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendAnalysisRequest(inputText.trim());
  };

  return (
    <>
      {/* Floating Trigger Button on bottom-right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full border border-emerald-500/40 bg-[#0d1b2a]/95 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 hover:border-emerald-400 group cursor-pointer"
          style={{
            boxShadow: '0 0 25px rgba(0,255,136,0.3), inset 0 0 15px rgba(0,255,136,0.1)'
          }}
        >
          <div className="relative">
            <Bot className="h-5 w-5 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase">
            AI Code Tutor
          </span>
          {errorOutput && (
            <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-full animate-pulse">
              Error detected
            </span>
          )}
        </button>
      )}

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div
          className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[440px] h-[580px] max-h-[85vh] flex flex-col rounded-2xl border border-emerald-500/40 bg-[#0a1224]/95 shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden"
          style={{
            boxShadow: '0 0 40px rgba(0,255,136,0.25), 0 0 80px rgba(0,212,255,0.15)'
          }}
        >
          {/* Top Neon Accent Stripe */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500" />

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#070d18]/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(0,255,136,0.3)]">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  VVS AI CodeTutor
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] font-mono text-cyan-400">
                  C &amp; Data Structures Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="Close Tutor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#050912] border-b border-slate-800/80 overflow-x-auto text-[11px] font-mono scrollbar-none">
            <button
              onClick={() => sendAnalysisRequest('Explain what is wrong with my code and give me a hint to fix it.')}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-emerald-400" />
              Explain Error
            </button>
            <button
              onClick={() => sendAnalysisRequest('Explain how memory allocation with malloc and free works in C.')}
              className="shrink-0 px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
            >
              malloc &amp; free
            </button>
            <button
              onClick={() => sendAnalysisRequest('Why does a Segmentation Fault occur in C?')}
              className="shrink-0 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 transition-colors cursor-pointer"
            >
              What is SIGSEGV?
            </button>
            <button
              onClick={() => sendAnalysisRequest('What is the time complexity of my current code?')}
              className="shrink-0 px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 transition-colors cursor-pointer"
            >
              Time Complexity
            </button>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs leading-relaxed">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-md ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-br-xs'
                      : 'bg-[#0f1b33] border border-slate-700/70 text-slate-200 rounded-bl-xs'
                  }`}
                >
                  {/* Error type tag if available */}
                  {m.errorType && (
                    <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <AlertCircle className="h-3 w-3 text-rose-400" />
                      {m.errorType}
                    </div>
                  )}

                  {/* Message body with basic markdown line formatting */}
                  <div className="whitespace-pre-wrap space-y-1">
                    {m.text.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={idx} className="font-bold text-emerald-400 mt-1 mb-0.5">{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('• ') || line.startsWith('- ')) {
                        return <div key={idx} className="pl-2 text-cyan-200">{line}</div>;
                      }
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>

                  {/* AI status tag */}
                  {m.sender === 'tutor' && (
                    <div className="mt-2 pt-1 border-t border-slate-700/40 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Sparkles className="h-2.5 w-2.5" />
                        {m.provider === 'groq' ? 'Qwen AI Tutor' : m.provider === 'gemini' ? 'Gemini AI Tutor' : 'AI Assistant'}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/20 w-fit">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>AI Tutor is analyzing your code...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-800 bg-[#070d18] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about your code..."
              disabled={isLoading}
              className="flex-1 bg-[#0f1b33] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
