import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, BookOpen, AlertCircle, HelpCircle } from 'lucide-react';
import { UserProfile, ChatMessage, ChatSession } from '../types';

interface TutorChatProps {
  profile: UserProfile | null;
  activeChatHistory: ChatMessage[];
  onSaveMessage: (newMessage: ChatMessage) => void;
  onClearHistory: () => void;
}

export default function TutorChat({
  profile,
  activeChatHistory,
  onSaveMessage,
  onClearHistory
}: TutorChatProps) {
  const [subject, setSubject] = useState(profile?.subjects[0] || 'Mathematics');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const subjects = profile?.subjects || ['Mathematics', 'English Language', 'Physics'];

  // Scroll to bottom whenever chat history increases
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatHistory, loading]);

  // Handle custom prompt clicks
  const triggerQuickQuestion = (qText: string) => {
    if (loading) return;
    sendMessage(qText);
  };

  const currentMonthYear = new Date().toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

  const sendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    // Clear input if sending from bar
    if (!customText) setInputText('');

    // Append student reply to parent state
    const studentMessage: ChatMessage = {
      id: `student-${Date.now()}`,
      sender: 'student',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    onSaveMessage(studentMessage);
    setLoading(true);

    try {
      // Package chat history
      const historyPayload = activeChatHistory.slice(-15); // keep last 15 chats for context

      const response = await fetch('/api/chat-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          history: historyPayload,
          message: textToSend,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error.');
      }

      if (data.text) {
        const tutorReply: ChatMessage = {
          id: `tutor-${Date.now()}`,
          sender: 'tutor',
          text: data.text,
          timestamp: new Date().toISOString(),
        };

        onSaveMessage(tutorReply);

        // Optional: Save whole thread to Firebase
        if (profile?.uid) {
          try {
            // We can append to chatHistory collection in Firebase asynchronously
            await addDoc(collection(db, 'chatHistory'), {
              userId: profile.uid,
              subject,
              message: tutorReply,
              createdAt: new Date().toISOString()
            });
          } catch (firebaseErr) {
            console.warn("Could not save chat history to Cloud (offline/network):", firebaseErr);
          }
        }
      } else {
        throw new Error('Tutor response was blank.');
      }
    } catch (err) {
      console.error('Error talking to AI Tutor:', err);
      const errorMsg: ChatMessage = {
        id: `tutor-err-${Date.now()}`,
        sender: 'tutor',
        text: "Kpai! My network is misbehaving here in the village. Let me restart my router and read my books again. Try sending me your question again, my friend!",
        timestamp: new Date().toISOString(),
      };
      onSaveMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Preset syllabus-aligned prompts depending on selected subject
  const getSubjectPresets = () => {
    switch (subject) {
      case 'Mathematics':
        return [
          'Give me practical steps to solve Quadratic Equations.',
          'Explain Trigonometric ratios like sine and cosine simply.',
          'What are the most common topics in WAEC General Maths?'
        ];
      case 'English Language':
        return [
          'How do I earn top marks in WAEC argumentative essay essays?',
          'Explain the difference between active and passive voice sentences.',
          'Give me 5 synonyms often tested in JAMB lexicons.'
        ];
      case 'Physics':
        return [
          'Explain Newton’s laws of motion using Nigerian danfo buses!',
          'What is electromagnetic induction? Give a simple formula and analogy.',
          'Explain the basic components checked in WAEC Physics practicals.'
        ];
      default:
        return [
          'Explain the high-yield syllabus concepts in this subject.',
          'Give me diagnostic tricks to guess smartly when options are tricky.',
          'How many hours should I allocate to this subject weekly?'
        ];
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* Sidebar Controls (4 columns) */}
      <div className="md:col-span-4 bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-sm space-y-4 h-full">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-base text-slate-800 flex items-center gap-1.5">
              <Bot className="h-5 w-5 text-emerald-600" />
              <span>Ask Uncle Chidi</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Select your subject below to start your personal lesson session. Present queries in plain format.
            </p>
          </div>

          {/* Subject dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Current Subject</label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                onClearHistory(); // clear screen when changing subjects to keep focus
              }}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 font-sans font-semibold text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Tutor profile specs */}
          <div className="p-3 bg-slate-50/50 rounded-xl space-y-1">
            <span className="text-[9px] font-mono text-emerald-700 font-bold uppercase tracking-wider">TUTOR ENGLINE</span>
            <p className="font-sans font-bold text-xs text-slate-800">Uncle Chidi’s Cabin</p>
            <p className="text-[10px] text-slate-500 leading-normal font-sans">
              Expert in WAEC, NECO and JAMB. Relates difficult theories to Nigerian life. Great at breaking down tough equations!
            </p>
          </div>
        </div>

        {/* Clear thread action */}
        {activeChatHistory.length > 0 && (
          <button
            onClick={onClearHistory}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 border border-slate-100 rounded-xl"
            id="btn-clear-chat"
          >
            Clear conversation feed
          </button>
        )}
      </div>

      {/* Main chat center (8 columns) */}
      <div className="md:col-span-8 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden shadow-sm h-full">
        {/* Chat banner display */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-slate-900 animate-pulse" />
              <div className="bg-emerald-600/30 text-emerald-400 p-1.5 rounded-lg font-bold text-xs">
                CH
              </div>
            </div>
            <div>
              <h4 className="font-sans font-bold text-xs sm:text-sm">Uncle Chidi</h4>
              <p className="text-[10px] text-emerald-400 font-mono">Exam Mentor • Active</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">{currentMonthYear} Standard</span>
        </div>

        {/* Messaging area scroll view */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
          
          {/* Initial greeting if empty */}
          {activeChatHistory.length === 0 && (
            <div className="text-center py-6 px-4 space-y-3 max-w-sm mx-auto">
              <div className="inline-flex items-center justify-center p-3.5 bg-white text-emerald-600 rounded-full border border-slate-100 shadow-sm">
                <Bot className="h-6 w-6" />
              </div>
              <h4 className="font-sans font-bold text-sm text-slate-800">Welcome to Lessons with Uncle Chidi!</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                "Hello my brilliant friend! Select your desired exam subject, and type any question you have. I am here to make sure you clear all your papers on your absolute first seating!"
              </p>
            </div>
          )}

          {activeChatHistory.map((msg) => {
            const isTutor = msg.sender === 'tutor';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 items-start max-w-[85%] ${
                  isTutor ? 'self-start' : 'ml-auto flex-row-reverse'
                }`}
              >
                {/* avatar mini icon */}
                <div className={`p-1.5 rounded-lg ${
                  isTutor ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {isTutor ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>

                {/* Text bubble */}
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans ${
                  isTutor
                    ? 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-tl-none'
                    : 'bg-slate-900 text-white rounded-tr-none'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5 items-start self-start max-w-[80%]">
              <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="bg-white text-slate-500 border border-slate-100 shadow-sm p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-xs font-sans font-medium animate-pulse">Uncle Chidi is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Prompts Row */}
        {activeChatHistory.length < 5 && (
          <div className="p-3 border-t border-slate-100 bg-white space-y-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Suggested Questions</p>
            <div className="flex flex-wrap gap-2">
              {getSubjectPresets().map((preset) => (
                <button
                  key={preset}
                  onClick={() => triggerQuickQuestion(preset)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-left text-[11px] text-slate-700 font-sans font-medium hover:-translate-y-0.5 transition-all"
                  id={`btn-preset-${preset.substring(0, 10)}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom input section bar */}
        <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
            placeholder={`Ask Uncle Chidi about ${subject}...`}
            className="flex-grow bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 font-sans text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !inputText.trim()}
            className="p-3 bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all"
            id="btn-trigger-send-chat"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
