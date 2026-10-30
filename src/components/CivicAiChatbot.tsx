import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  FilePlus2,
  ExternalLink,
  Loader2,
  Bot,
  User as UserIcon,
  RotateCcw,
} from 'lucide-react';
import { IssueCategory } from '../types';
import { getRealPhotoForCategory } from '../lib/syntheticAssets';

export interface AiDraftReport {
  title: string;
  description: string;
  location: string;
  category: IssueCategory;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedIssueId?: number | null;
  draftReport?: AiDraftReport | null;
}

interface CivicAiChatbotProps {
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  onApplyDraftToReport: (draft: {
    title: string;
    description: string;
    location: string;
    photo_url?: string;
  }) => void;
  onInspectIssue: (id: number) => void;
}

const QUICK_AI_PROMPTS = [
  'Draft report: Live wire sparking near Durgachak school gate',
  'What is the current status of Issue #1 and #4?',
  'Draft in Bengali: Basudevpur rasta gaddha and jol pipe leak',
  'Which wards have urgent open water or electricity issues?',
];

export const CivicAiChatbot: React.FC<CivicAiChatbotProps> = ({
  isOpen,
  onToggleOpen,
  onApplyDraftToReport,
  onInspectIssue,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'Hello! I am your **CivicCare Haldia AI Assistant**.\n\nTell me about any civic hazard in English, Bengali, or Hindi and I will **instantly draft your report**, or ask me to check the live status of any Issue ID (#1–#28) across Haldia wards.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      // Lightweight payload without blocking on Firestore reads
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
        }),
      });

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text:
          data.reply ||
          'I processed your request. You can use the actions below to report or track an issue.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedIssueId: data.suggestedIssueId || null,
        draftReport: data.draftReport || null,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'Could not reach the AI assistant service right now. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: 'Chat cleared! How can I help you report or track a civic issue in Haldia today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating AI Assistant Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onToggleOpen(true)}
          className="fixed bottom-16 md:bottom-6 right-4 sm:right-5 z-40 h-11 sm:h-12 px-3.5 sm:px-4 rounded-[12px] bg-[#171925] hover:bg-[#4f46c8] text-white shadow-lg border border-[#222431] inline-flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
        >
          <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#c9c8f1]" />
          <span>CivicCare AI Chat</span>
        </button>
      )}

      {/* Slide-Over AI Chatbot Panel */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[400px] sm:h-[580px] z-50 bg-white sm:rounded-[14px] border border-[#d8dbe2] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#171925] text-[#f7f7fb] px-4 py-3.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-[#4f46c8] flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">
                  CivicCare AI Assistant
                </div>
                <div className="text-[11px] text-[#c9c8f1]">
                  Instant Haldia Triage · Report Drafting · Status Lookup
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearChat}
                title="Reset conversation"
                className="w-8 h-8 rounded-[6px] bg-[#222431] hover:bg-[#344da6] text-[#f7f7fb] flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                aria-label="Close AI Chatbot"
                className="w-8 h-8 rounded-[6px] bg-[#222431] hover:bg-[#a33e3e] text-[#f7f7fb] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Starter Prompts */}
          <div className="bg-[#f7f8fb] border-b border-[#d8dbe2] px-3.5 py-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5">
              {QUICK_AI_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={sending}
                  className="px-2.5 py-1 rounded-[6px] border border-[#d8dbe2] bg-white hover:border-[#4f46c8] hover:text-[#4f46c8] text-[11px] font-medium text-[#17181d] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f4f5f8]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user'
                      ? 'bg-[#4f46c8] text-white'
                      : 'bg-[#171925] text-[#c9c8f1]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <UserIcon className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`max-w-[84%] rounded-[10px] p-3 text-xs leading-relaxed space-y-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#4f46c8] text-white'
                      : 'bg-white border border-[#d8dbe2] text-[#17181d] shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Action 1: AI Generated Draft Report Card */}
                  {msg.draftReport && (
                    <div className="p-2.5 rounded-[8px] bg-[#f7f8fb] border border-[#c9c8f1] text-[#17181d] space-y-2 mt-2">
                      <div className="text-[11px] font-bold text-[#4f46c8]">
                        AI Drafted Report ({msg.draftReport.category} Dept)
                      </div>
                      <div className="text-xs font-semibold">{msg.draftReport.title}</div>
                      <div className="text-[11px] text-[#5e606b]">
                        {msg.draftReport.location}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!msg.draftReport) return;
                          onApplyDraftToReport({
                            title: msg.draftReport.title,
                            description: msg.draftReport.description,
                            location: msg.draftReport.location,
                            photo_url: getRealPhotoForCategory(msg.draftReport.category),
                          });
                          onToggleOpen(false);
                        }}
                        className="w-full h-8 px-3 rounded-[6px] bg-[#4f46c8] hover:bg-[#4338b5] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" />
                        <span>Autofill Report Form with Draft</span>
                      </button>
                    </div>
                  )}

                  {/* Action 2: Suggested Issue Lookup Link */}
                  {msg.suggestedIssueId && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (msg.suggestedIssueId) {
                            onInspectIssue(msg.suggestedIssueId);
                            onToggleOpen(false);
                          }
                        }}
                        className="h-8 px-3 rounded-[6px] border border-[#4f46c8] bg-[#e8e8fb] hover:bg-[#4f46c8] text-[#4f46c8] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>View Issue #{msg.suggestedIssueId} &amp; Live Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`text-[10px] font-mono ${
                      msg.role === 'user' ? 'text-white/75 text-right' : 'text-[#858793]'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-[#5e606b] pl-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4f46c8]" />
                <span>CivicCare AI is responding...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-white border-t border-[#d8dbe2] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about an issue #ID or describe a problem..."
              className="flex-1 h-10 px-3 rounded-[8px] border border-[#d8dbe2] text-xs bg-[#f7f8fb] text-[#17181d] placeholder:text-[#858793] focus:outline-none focus:ring-2 focus:ring-[#4f46c8] focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-10 px-3.5 rounded-[8px] bg-[#4f46c8] hover:bg-[#4338b5] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
