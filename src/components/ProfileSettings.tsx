import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Award, User, BookOpen, Check, ShieldCheck, Heart } from 'lucide-react';
import { UserProfile, TargetExam } from '../types';

interface ProfileSettingsProps {
  profile: UserProfile | null;
  onSaveProfile: (newProfile: UserProfile) => void;
  onClose: () => void;
}

export default function ProfileSettings({ profile, onSaveProfile, onClose }: ProfileSettingsProps) {
  const [targetExam, setTargetExam] = useState<TargetExam>(profile?.targetExam || 'WAEC');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    profile?.subjects || ['Mathematics', 'English Language', 'Physics']
  );
  const [saving, setSaving] = useState(false);

  // High-yield syllabus list specific to Nigerian secondary curriculum
  const availableSubjects = [
    'Mathematics',
    'English Language',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
    'Government',
    'Literature-in-English',
    'Financial Accounting'
  ];

  const handleToggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length === 1) return; // Must have at least one subject
      setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const updatedProfile: UserProfile = {
      ...profile,
      targetExam,
      subjects: selectedSubjects,
      updatedAt: new Date().toISOString()
    };

    // Update local state in App.tsx immediately for flawless responsive interaction
    onSaveProfile(updatedProfile);
    
    // Close settings modal/drawer
    onClose();

    try {
      // Sync into firestore/offline cache in background
      const userRef = doc(db, 'users', profile.uid);
      await setDoc(userRef, updatedProfile, { merge: true });
    } catch (err) {
      console.warn('Could not sync user profile preferences to cloud (offline/network), saved locally instead:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-sans font-bold text-base text-slate-800">Academic Target settings</h3>
          <p className="text-xs text-slate-400 font-sans">
            Configure your active exams and target subjects to configure lesson planners.
          </p>
        </div>
        <BookOpen className="h-6 w-6 text-emerald-600" />
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        
        {/* Exam Selection Toggles */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Target High School Examination</label>
          <div className="grid grid-cols-3 gap-3">
            {(['WAEC', 'NECO', 'JAMB'] as TargetExam[]).map((exam) => {
              const isSelected = targetExam === exam;
              return (
                <button
                  key={exam}
                  onClick={() => setTargetExam(exam)}
                  className={`py-3.5 rounded-xl border text-sm font-sans font-extrabold tracking-wide transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10'
                      : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {exam}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subjects list selects */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Target Study Subjects</label>
          <p className="text-[10px] text-slate-400 font-sans">Choose up to 9 active subjects included in your learning path.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableSubjects.map((sub) => {
              const isChecked = selectedSubjects.includes(sub);
              return (
                <button
                  key={sub}
                  onClick={() => handleToggleSubject(sub)}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between text-xs font-sans font-semibold transition-all ${
                    isChecked
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                  }`}
                  id={`btn-toggle-sub-${sub}`}
                >
                  <span>{sub}</span>
                  <div className={`h-4 w-4 rounded flex items-center justify-center border ${
                    isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200'
                  }`}>
                    {isChecked && <Check className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirmation banner */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-[11px] text-slate-500 font-sans leading-normal">
            By saving changes, Uncle Chidi will automatically align all dialogue answers, analogies, dynamic quizzes, and timeline milestones to matches your new target exam’s syllabus questions.
          </p>
        </div>

        {/* Save Controls */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-sans font-bold text-slate-500 rounded-xl"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
            disabled={saving}
            id="btn-save-profile-setup"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
