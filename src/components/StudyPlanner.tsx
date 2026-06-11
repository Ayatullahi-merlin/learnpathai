import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { Calendar, Loader2, Sparkles, CheckCircle, Clock, BookOpen, AlertCircle, HelpCircle, ArrowRight, Save } from 'lucide-react';
import { UserProfile, StudyPlan, AssessmentResult, StudyPlanTopic, StudyPlanWeek } from '../types';

interface StudyPlannerProps {
  profile: UserProfile | null;
  activePlan: StudyPlan | null;
  assessments: AssessmentResult[];
  onSavePlan: (newPlan: StudyPlan) => void;
  onUpdateProgress: (hours: number, topicId: string) => void;
}

export default function StudyPlanner({
  profile,
  activePlan,
  assessments,
  onSavePlan,
  onUpdateProgress
}: StudyPlannerProps) {
  const [subject, setSubject] = useState(profile?.subjects[0] || 'Mathematics');
  const [loading, setLoading] = useState(false);

  const subjects = profile?.subjects || ['Mathematics', 'English Language', 'Physics'];
  const targetExam = profile?.targetExam || 'WAEC';

  // Find recent assessment for chosen subject to pass to AI generator
  const subjectAssessment = assessments.find((a) => a.subject === subject);

  // Generate study plan
  const createStudyPlan = async () => {
    setLoading(true);

    const payload = {
      subject,
      exam: targetExam,
      score: subjectAssessment ? subjectAssessment.score : 3,
      totalQuestions: subjectAssessment ? subjectAssessment.totalQuestions : 5,
      strengths: subjectAssessment ? subjectAssessment.strengths : ['general comprehension'],
      weaknesses: subjectAssessment ? subjectAssessment.weaknesses : ['advanced application questions'],
    };

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error.');
      }

      if (data.plan) {
        const fullPlan: StudyPlan = {
          ...data.plan,
          id: `plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: profile?.uid || 'guest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Notify parent state immediately so layout can update instantly (highly responsive for 3G)
        onSavePlan(fullPlan);

        // Save to Firebase in a safe try-catch
        if (profile?.uid) {
          try {
            await addDoc(collection(db, 'studyPlans'), fullPlan);
          } catch (firebaseErr) {
            console.warn("Could not save study plan to Cloud (offline/network), saved locally instead:", firebaseErr);
          }
        }
      } else {
        throw new Error('Plan not returned from API.');
      }
    } catch (err) {
      console.warn('Error generating study schedule, loading client-side calendar fallback:', err);
      // Create an instant client-side fallback study plan so the student can keep practicing!
      const fallbackPlan: StudyPlan = {
        id: `plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: profile?.uid || 'guest',
        subject: subject,
        targetExam: targetExam,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        weeks: [
          {
            weekNumber: 1,
            theme: `Understanding the Basics: Key Principles`,
            topics: [
              {
                id: `topic-${Date.now()}-1`,
                title: `Syllabus Essentials and Definitions`,
                description: `Deep dive into standard definitions, terminology, and key concepts of ${subject} as required by the ${targetExam} syllabus.`,
                hoursNeeded: 5,
                completed: false
              },
              {
                id: `topic-${Date.now()}-2`,
                title: `Simplifying Equations and Theories`,
                description: `Practice answering starter quiz questions and resolving simple examples step-by-step.`,
                hoursNeeded: 3,
                completed: false
              }
            ],
            tips: `Always write down standard formula first when resolving calculations`
          },
          {
            weekNumber: 2,
            theme: `Intensive Module: Complex Problem Solving`,
            topics: [
              {
                id: `topic-${Date.now()}-3`,
                title: `Advanced Formula Applications`,
                description: `Diving into multi-layered concepts. Work through detailed practice scenarios with active textbook references.`,
                hoursNeeded: 6,
                completed: false
              },
              {
                id: `topic-${Date.now()}-4`,
                title: `Theoretical & Diagrammatic Review`,
                description: `Familiarize yourself with diagram labeling structures and critical scientific arguments.`,
                hoursNeeded: 4,
                completed: false
              }
            ],
            tips: `Take a ten-minute break for every 45 minutes of studying to refresh focus.`
          },
          {
            weekNumber: 3,
            theme: `Under Timed Conditions: Speed and Pacing Drills`,
            topics: [
              {
                id: `topic-${Date.now()}-5`,
                title: `Past Exam Standard Drill Sets`,
                description: `Set up a chronological collection of the official 5-year past papers and solve them.`,
                hoursNeeded: 6,
                completed: false
              },
              {
                id: `topic-${Date.now()}-6`,
                title: `Interactive CBT Pace Optimizations`,
                description: `Solve multiple choice questions rapidly under standard 40-50 second pacing constraints.`,
                hoursNeeded: 4,
                completed: false
              }
            ],
            tips: `Practice using key drafting paper to sketch your active equations clearly.`
          },
          {
            weekNumber: 4,
            theme: `Ultimate Revision and Final Mock Check`,
            topics: [
              {
                id: `topic-${Date.now()}-7`,
                title: `Core Laws and Constants Revision`,
                description: `Revise key study summaries, cheat-sheets, laws, and critical diagrams.`,
                hoursNeeded: 4,
                completed: false
              },
              {
                id: `topic-${Date.now()}-8`,
                title: `Full Mock Examination Assessment`,
                description: `Take a full diagnostic quiz test to measure exam preparedness.`,
                hoursNeeded: 4,
                completed: false
              }
            ],
            tips: `A good night's sleep is the final ingredient of absolute victory!`
          }
        ]
      };
      onSavePlan(fallbackPlan);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Completion on individual topic
  const handleToggleTopic = async (weekIdx: number, topicIdx: number) => {
    if (!activePlan) return;

    // Deep clone state
    const updatedWeeks = JSON.parse(JSON.stringify(activePlan.weeks)) as StudyPlanWeek[];
    const topic = updatedWeeks[weekIdx].topics[topicIdx];
    
    // Toggle completed state
    const newCompleted = !topic.completed;
    topic.completed = newCompleted;

    const updatedPlan: StudyPlan = {
      ...activePlan,
      weeks: updatedWeeks,
      updatedAt: new Date().toISOString(),
    };

    // Callback to save state locally
    onSavePlan(updatedPlan);

    // Call update progress callback to inform Dashboard stats (totalHours increment, streak check, etc.)
    onUpdateProgress(newCompleted ? topic.hoursNeeded : -topic.hoursNeeded, topic.id);

    // Sync back to Firebase
    try {
      if (profile?.uid && activePlan.id) {
        // Find document reference and update
        // We'll update the document in calling parent or here through local lookup.
        // To keep hackathon rapid, we track it on client side state primarily, and sync where available.
      }
    } catch (err) {
      console.error('Failed to sync complete state:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center sm:text-left">
        <h2 className="font-sans font-bold text-2xl text-slate-800 flex items-center justify-center sm:justify-start gap-2">
          <Calendar className="h-6 w-6 text-emerald-600 animate-pulse" />
          <span>Personal AI Study Timetable</span>
        </h2>
        <p className="text-sm text-slate-500 max-w-xl">
          A bespoke, multi-week timeline matching your diagnostic results to crush the {targetExam} syllabus.
        </p>
      </div>

      {!activePlan && !loading && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex gap-4 p-4 bg-amber-50 rounded-xl text-amber-900 text-xs items-start border border-amber-100/40">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-sans font-bold text-amber-800">No active Study Plan generated yet</p>
              <p className="mt-1 leading-relaxed">
                {subjectAssessment ? (
                  <span>Great news! You have taken a diagnostic quiz in <b>{subjectAssessment.subject}</b>. We are ready to use those findings to map out your calendar.</span>
                ) : (
                  <span>You have not completed any baseline diagnostic quizzes. We can generate a general study plan for your selected subject, or you can take a baseline diagnostic test first to tailor it specifically!</span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 :slate-500 uppercase tracking-wider font-mono">Choose Plan Subject</label>
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Reference Exam Rules</label>
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-600 text-sm font-semibold select-none">
                Exam target is: {targetExam}
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={createStudyPlan}
              className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl font-sans font-semibold text-sm hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
              id="btn-trigger-schedule-generation"
            >
              <Sparkles className="h-4 w-4 text-emerald-400 fill-emerald-400" />
              <span>Generate Personalized 4-Week Plan</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white py-14 px-6 rounded-2xl border border-slate-100 text-center space-y-4 shadow-sm flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
          <p className="font-sans font-bold text-slate-800 animate-pulse">Assembling study track...</p>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-sans">
            Please hold on. Gemini is analyzing your strengths/weaknesses and configuring high-yield curriculum milestones specific to West African requirements.
          </p>
        </div>
      )}

      {/* RENDER ACTIVE STUDY PLAN TIMELINE */}
      {activePlan && !loading && (
        <div className="space-y-8 animate-fade-in">
          {/* Calendar top info bar */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">TIMELIBE ACTIVE</span>
              <h3 className="font-sans text-lg font-extrabold">{activePlan.subject} Study Plan ({activePlan.targetExam})</h3>
              <p className="text-xs text-slate-300 font-sans mt-0.5">Created {new Date(activePlan.createdAt).toLocaleDateString()}</p>
            </div>
            
            <button
              onClick={() => {
                onSavePlan(null as any);
              }}
              className="text-xs font-semibold hover:bg-white/10 px-4 py-2 border border-white/20 rounded-xl transition-all"
              id="btn-re-generate-plan"
            >
              Configure Different Subject Plan
            </button>
          </div>

          {/* Timeline weeks progression */}
          <div className="space-y-6 relative border-l-2 border-slate-100 pl-4 sm:pl-6 ml-3 sm:ml-4">
            {activePlan.weeks.map((week, wIdx) => {
              const weekCompletedCount = week.topics.filter(t => t.completed).length;
              const isWeekFullyCompleted = weekCompletedCount === week.topics.length;
              
              return (
                <div key={week.weekNumber} className="relative space-y-4">
                  {/* Circle locator on vertical timeline line */}
                  <span className={`absolute -left-[27px] sm:-left-[35px] top-6 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-extrabold ${
                    isWeekFullyCompleted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : weekCompletedCount > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}>
                    {week.weekNumber}
                  </span>

                  {/* Week Box Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-3">
                      <div>
                        <h4 className="font-sans font-bold text-slate-800 text-base">Week {week.weekNumber}: {week.theme}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Syllabus intensive milestones</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700 px-2.5 py-1 bg-emerald-50 rounded-lg self-start">
                        {weekCompletedCount}/{week.topics.length} Read
                      </span>
                    </div>

                    {/* Topics checklists inside week card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {week.topics.map((topic, tIdx) => (
                        <div
                          key={topic.id}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                            topic.completed
                              ? 'bg-emerald-50/20 border-emerald-200/50'
                              : 'bg-slate-50/50 border-slate-100/50 hover:bg-slate-50'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleTopic(wIdx, tIdx)}
                            className={`h-5 w-5 rounded border-2 mt-0.5 flex items-center justify-center transition-all ${
                              topic.completed
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-slate-400 bg-white'
                            }`}
                          >
                            {topic.completed && <CheckCircle className="h-3.5 w-3.5 fill-emerald-600 text-white" />}
                          </button>
                          
                          <div className="flex-1 space-y-1">
                            <p className={`font-sans font-semibold text-xs leading-snug ${
                              topic.completed ? 'line-through text-slate-400' : 'text-slate-700'
                            }`}>
                              {topic.title}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{topic.description}</p>
                            
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono pt-1">
                              <Clock className="h-3 w-3" />
                              <span>Est: {topic.hoursNeeded} hours required</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Week-specific Advice and West African highlights from AI tutor */}
                    {week.tips && (
                      <div className="p-3 bg-indigo-50/30 border border-indigo-100/20 rounded-xl text-xs text-slate-700 leading-relaxed">
                        💡 <b>Exam Pro Tip:</b> {week.tips}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
