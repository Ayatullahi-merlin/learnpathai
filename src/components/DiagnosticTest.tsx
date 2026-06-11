import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Sparkles, Brain, Loader2, ArrowRight, Check, X, AlertOctagon, HelpCircle, BookOpen, ThumbsUp } from 'lucide-react';
import { DiagnosticQuestion, UserProfile, AssessmentResult } from '../types';

interface DiagnosticTestProps {
  profile: UserProfile | null;
  onSaveAssessment: (result: AssessmentResult) => void;
  onNavigate: (tab: string) => void;
}

export default function DiagnosticTest({ profile, onSaveAssessment, onNavigate }: DiagnosticTestProps) {
  const [subject, setSubject] = useState(profile?.subjects[0] || 'Mathematics');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<AssessmentResult | null>(null);

  const subjects = profile?.subjects || ['Mathematics', 'English Language', 'Physics'];
  const targetExam = profile?.targetExam || 'WAEC';

  // Fetch Questions from backend
  const startDiagnostic = async () => {
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuizFinished(false);
    setDiagnosticResult(null);

    try {
      const response = await fetch('/api/generate-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, exam: targetExam }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server returned an error.');
      }

      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      } else {
        throw new Error('Did not receive a valid array of questions.');
      }
    } catch (err) {
      console.warn('Error starting diagnostic assessment, activating client-side offline database fallback:', err);
      // Create local offline fallback questions matching standard structures so the user is never stuck!
      const fallbackQuestions: DiagnosticQuestion[] = [
        {
          id: `math-offline-${Date.now()}-1`,
          subject: subject,
          question: `Evaluate the following indices expression: (8)^(2/3) \\times (9)^(-1/2).`,
          options: ["2", "1.33", "4/3", "1.5"],
          correctIndex: 2,
          explanation: `(8)^(2/3) is the cube root of 8 squared, which is 2² = 4. (9)^(-1/2) is 1 over the square root of 9, which is 1/3. Multiplying them gives 4/3. This remains a highly typical indices question on West African exams!`
        },
        {
          id: `math-offline-${Date.now()}-2`,
          subject: subject,
          question: `Which of these represents the correct antonym of the italicized word in: 'The teacher's advice was highly *beneficial*.'`,
          options: ["detrimental", "prosperous", "essential", "insignificant"],
          correctIndex: 0,
          explanation: `'Beneficial' means helpful or advantageous. The direct antonym is 'detrimental' (harmful or causing damage).`
        },
        {
          id: `math-offline-${Date.now()}-3`,
          subject: subject,
          question: `What is the primary power source organelle within eukaryotic animal cells?`,
          options: ["Mitochondrion", "Ribosome", "Nucleolus", "Golgi Body"],
          correctIndex: 0,
          explanation: `The mitochondrion is the powerhouse that synthesizes adenosine triphosphate (ATP) via aerobic cellular respiration.`
        },
        {
          id: `math-offline-${Date.now()}-4`,
          subject: subject,
          question: `Calculate the effective resistance of two 12-ohm resistors connected in a parallel format.`,
          options: ["6 ohms", "24 ohms", "12 ohms", "4 ohms"],
          correctIndex: 0,
          explanation: `For identical parallel resistors, R_eff = R / n = 12 / 2 = 6 ohms. Quick and high-yield standard calculation!`
        },
        {
          id: `math-offline-${Date.now()}-5`,
          subject: subject,
          question: `Which of these techniques is scientifically proven to optimize active recall and retention?`,
          options: ["Spaced repetition drills", "Passive reading & highlighting", "Cramming definitions late at night", "Avoiding mock tests"],
          correctIndex: 0,
          explanation: `Spaced repetition and active recall are the highest-rated learning techniques for Nigerian curriculum students.`
        }
      ];
      setQuestions(fallbackQuestions);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (optionIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: optionIndex,
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const finishAssessment = async () => {
    let score = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    questions.forEach((q, idx) => {
      const chosen = selectedAnswers[idx];
      if (chosen === q.correctIndex) {
        score += 1;
        strengths.push(q.question.substring(0, 30) + '...');
      } else {
        weaknesses.push(q.question.substring(0, 30) + '...');
      }
    });

    // Make sure we have a few standard themes if empty
    if (strengths.length === 0) strengths.push('Baseline knowledge of the syllabus');
    if (weaknesses.length === 0) weaknesses.push(`${subject} core exam strategies`);

    const resultPayload: AssessmentResult = {
      id: `diag-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: profile?.uid || 'guest',
      subject,
      score,
      totalQuestions: questions.length,
      strengths: Array.from(new Set(strengths)),
      weaknesses: Array.from(new Set(weaknesses)),
      takenAt: new Date().toISOString(),
    };

    setDiagnosticResult(resultPayload);
    setQuizFinished(true);

    // Notify parent local state immediately so score changes are visible (crucial for responsive 3G/offline)
    onSaveAssessment(resultPayload);

    // Persist result payload to server in background
    if (profile?.uid) {
      try {
        await addDoc(collection(db, 'assessments'), resultPayload);
      } catch (err) {
        console.warn('Could not save diagnostic outcomes to Firebase (offline/network), saved locally instead:', err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header section */}
      <div className="space-y-1.5 text-center sm:text-left">
        <h2 className="font-sans font-bold text-2xl text-slate-800 flex items-center justify-center sm:justify-start gap-2">
          <Brain className="h-6 w-6 text-emerald-600 animate-pulse" />
          <span>Syllabus Diagnostic Portal</span>
        </h2>
        <p className="text-sm text-slate-500 max-w-xl">
          Instantly locate the exact chapters, themes, or formulas blocking you from getting an A1 in {targetExam}.
        </p>
      </div>

      {!loading && questions.length === 0 && !quizFinished && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Subject selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Select Assessment Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-sans text-slate-700 font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-500"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Target Exam info */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Reference Exam Standard</label>
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 select-none">
                <span className="font-sans font-extrabold text-emerald-800 text-sm">{targetExam} Syllabus Standard</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl text-xs text-slate-600 leading-relaxed border border-emerald-100/30">
            💡 <b>How it works:</b> Our AI engine parses historical WAEC, NECO, and JAMB exams. It generates 5 custom questions to pinpoint your knowledge level. On completing the quiz, LearnPath AI constructs your custom weekly study calendar.
          </div>

          <div className="pt-2">
            <button
              onClick={startDiagnostic}
              className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl font-sans font-semibold text-sm hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
              id="btn-trigger-diagnostic"
            >
              <Sparkles className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>Generate Diagnostic Test</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white py-14 px-6 rounded-2xl border border-slate-100 text-center space-y-4 shadow-sm flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
          <p className="font-sans font-bold text-slate-800">Compiling Exam Diagnostics...</p>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Please wait. Uncle Chidi and our AI syllabus experts are extracting core high-yield {subject} questions matching modern {targetExam} templates.
          </p>
        </div>
      )}

      {questions.length > 0 && !quizFinished && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {/* Progress bar */}
          <div className="bg-slate-100 h-1.5 w-full">
            <div
              className="bg-emerald-500 h-1.5 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Quiz window */}
          <div className="p-6 sm:p-8 space-y-6 flex-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-widest">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-xs font-semibold font-sans px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                Subject: {subject}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="font-sans font-bold text-base sm:text-lg text-slate-800 leading-snug">
              {questions[currentIndex].question}
            </h3>

            {/* Options list */}
            <div className="space-y-3">
              {questions[currentIndex].options.map((option, oIdx) => {
                const isSelected = selectedAnswers[currentIndex] === oIdx;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectAnswer(oIdx)}
                    className={`w-full text-left p-4 rounded-xl border font-sans text-sm font-medium transition-all duration-150 flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/5'
                        : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <span>{option}</span>
                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs ${
                        isSelected
                          ? 'border-white text-slate-900 bg-white font-bold'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={finishAssessment}
                disabled={selectedAnswers[currentIndex] === undefined}
                className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-sans text-xs font-bold transition-all duration-200 shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
                id="btn-quiz-submit"
              >
                Submit Diagnostics
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={selectedAnswers[currentIndex] === undefined}
                className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 rounded-xl font-sans text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <span>Nest</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Finished screen */}
      {quizFinished && diagnosticResult && (
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-100 shadow-sm space-y-8 animate-fade-in">
          {/* Score card */}
          <div className="text-center space-y-3 max-w-sm mx-auto">
            <p className="inline-flex items-center justify-center p-3.5 bg-emerald-50 text-emerald-600 rounded-full">
              <ThumbsUp className="h-8 w-8" />
            </p>
            <h3 className="text-2xl font-sans font-extrabold text-slate-800">Diagnostic Finished!</h3>
            <p className="text-sm text-slate-400 font-sans">You took the baseline exam prep assessment.</p>
            
            {/* Visual dial */}
            <div className="py-4">
              <div className="inline-block relative">
                <span className="text-5xl font-mono font-black text-emerald-700">{diagnosticResult.score}</span>
                <span className="text-lg font-bold text-slate-400"> / {diagnosticResult.totalQuestions}</span>
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-1 font-mono uppercase tracking-widest">
                Score: {diagnosticResult.score * 20}% Success
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-slate-50">
            {/* Strengths */}
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/20 space-y-2">
              <h4 className="font-sans font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Curriculum Modules Secured</span>
              </h4>
              <ul className="text-xs text-emerald-950 space-y-1 z-10 relative">
                {diagnosticResult.score > 0 ? (
                  <li className="list-disc leading-relaxed ml-2">Secure response in selected exam questions</li>
                ) : null}
                <li className="list-disc leading-relaxed ml-2">General baseline subjects orientation</li>
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100/20 space-y-2">
              <h4 className="font-sans font-bold text-rose-800 text-sm flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4" />
                <span>AI Identified Study Gaps</span>
              </h4>
              <ul className="text-xs text-rose-950 space-y-1 font-sans">
                {diagnosticResult.score < questions.length ? (
                  <li className="list-disc leading-relaxed ml-2">Target formulas and specific concept applications</li>
                ) : null}
                <li className="list-disc leading-relaxed ml-2">Speed, pacing management, and computer format drilling</li>
              </ul>
            </div>
          </div>

          {/* Action to build the plan */}
          <div className="bg-slate-50 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span>Ready to build your study path?</span>
              </h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                LearnPath AI will instantly create a 4-week structured calendar addressing these exact study gaps.
              </p>
            </div>
            <button
              onClick={() => onNavigate('planner')}
              className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-xl font-sans font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md"
              id="finished-btn-build-schedule"
            >
              <span>Build AI Study Plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Explanations Accordion */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <h4 className="font-sans font-bold text-slate-800 text-sm">Review Questions & Explanations:</h4>
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const isCorrect = selectedAnswers[idx] === q.correctIndex;
                return (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-100 bg-white space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-sans font-semibold text-xs text-slate-800 leading-snug">
                        {idx + 1}. {q.question}
                      </p>
                      {isCorrect ? (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">Correct</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-full">Incorrect</span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-500 font-sans space-y-1 pl-2 border-l border-slate-100">
                      <p><b>Your Choice:</b> {q.options[selectedAnswers[idx] || 0]}</p>
                      <p><b>Correct Choice:</b> {q.options[q.correctIndex]}</p>
                      <p className="text-emerald-700 bg-emerald-50/50 p-2 rounded-lg mt-2 font-sans font-medium">
                        💡 <b>AI Explanation:</b> {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
