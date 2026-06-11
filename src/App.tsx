import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, doc, setDoc, addDoc } from 'firebase/firestore';
import { GraduationCap, LogIn, Sparkles, BookOpen, Calendar, HelpCircle, MessageSquare, Award, Flame, Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import DiagnosticTest from './components/DiagnosticTest';
import StudyPlanner from './components/StudyPlanner';
import TutorChat from './components/TutorChat';
import ProfileSettings from './components/ProfileSettings';
import { UserProfile, StudentProgress, Badge, StudyPlan, AssessmentResult, ChatMessage } from './types';

// Helper functions for offline localStorage backups
const getLocalBackup = <T,>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const saveLocalBackup = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save local storage backup for ${key}:`, e);
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isNewUserSetupOpen, setIsNewUserSetupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Core Data Stores
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  // Setup initial variables for new profile creation
  const [initialExam, setInitialExam] = useState<'WAEC' | 'NECO' | 'JAMB'>('WAEC');
  const [setupStep, setSetupStep] = useState(1);

  // Watch Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        // Load initial offline state first for instantaneous responsiveness (crucial on 3G)
        const localProf = getLocalBackup<UserProfile | null>(`profile_${currentUser.uid}`, null);
        if (localProf) {
          setProfile(localProf);
          setIsNewUserSetupOpen(false);
          
          setAssessments(getLocalBackup<AssessmentResult[]>(`assessments_${currentUser.uid}`, []));
          setActivePlan(getLocalBackup<StudyPlan | null>(`activePlan_${currentUser.uid}`, null));
          setChatHistory(getLocalBackup<ChatMessage[]>(`chatHistory_${currentUser.uid}`, []));
          setProgress(getLocalBackup<StudentProgress | null>(`progress_${currentUser.uid}`, null));
          setBadges(getLocalBackup<Badge[]>(`badges_${currentUser.uid}`, []));
        }

        try {
          // Fetch user Profile from cloud
          const profileRef = doc(db, 'users', currentUser.uid);
          let fetchedProfile: UserProfile | null = null;
          try {
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
              fetchedProfile = profileSnap.data() as UserProfile;
              saveLocalBackup(`profile_${currentUser.uid}`, fetchedProfile);
            }
          } catch (profileError) {
            console.warn("Could not get profile from server/cache, trying localStorage fallback:", profileError);
            fetchedProfile = localProf || getLocalBackup<UserProfile | null>(`profile_${currentUser.uid}`, null);
          }
          
          if (fetchedProfile) {
            setProfile(fetchedProfile);
            setIsNewUserSetupOpen(false);
            // Fetch dependent resources
            await loadStudentSubData(currentUser.uid, fetchedProfile);
          } else {
            // Unregistered user, open onboarding popup
            setIsNewUserSetupOpen(true);
          }
        } catch (err) {
          console.error("Error reading student context:", err);
        } finally {
          setLoading(false);
        }
      } else {
        // Clear variables
        setProfile(null);
        setAssessments([]);
        setActivePlan(null);
        setChatHistory([]);
        setProgress(null);
        setBadges([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch student records from Firestore
  const loadStudentSubData = async (uid: string, currentProfile: UserProfile) => {
    // 1. Fetch Assessments
    try {
      const assessmentSnap = await getDocs(query(collection(db, 'assessments'), where('userId', '==', uid)));
      const fetchedAssessments = assessmentSnap.docs.map(doc => doc.data() as AssessmentResult);
      setAssessments(fetchedAssessments);
      saveLocalBackup(`assessments_${uid}`, fetchedAssessments);
    } catch (err) {
      console.warn("Error loading assessments, falling back to localStorage:", err);
      const backup = getLocalBackup<AssessmentResult[]>(`assessments_${uid}`, []);
      setAssessments(backup);
    }

    // 2. Fetch Study Plans
    try {
      const studyPlanSnap = await getDocs(query(collection(db, 'studyPlans'), where('userId', '==', uid)));
      if (!studyPlanSnap.empty) {
        const plans = studyPlanSnap.docs.map(doc => doc.data() as StudyPlan);
        plans.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setActivePlan(plans[0]);
        saveLocalBackup(`activePlan_${uid}`, plans[0]);
      } else {
        const backup = getLocalBackup<StudyPlan | null>(`activePlan_${uid}`, null);
        setActivePlan(backup);
      }
    } catch (err) {
      console.warn("Error loading study plans, falling back to localStorage:", err);
      const backup = getLocalBackup<StudyPlan | null>(`activePlan_${uid}`, null);
      setActivePlan(backup);
    }

    // 3. Fetch Badges
    try {
      const badgesSnap = await getDocs(query(collection(db, 'badges'), where('userId', '==', uid)));
      const fetchedBadges = badgesSnap.docs.map(doc => doc.data() as Badge);
      setBadges(fetchedBadges);
      saveLocalBackup(`badges_${uid}`, fetchedBadges);
    } catch (err) {
      console.warn("Error loading badges, falling back to localStorage:", err);
      const backup = getLocalBackup<Badge[]>(`badges_${uid}`, []);
      setBadges(backup);
    }

    // 4. Fetch Progress
    try {
      const progressRef = doc(db, 'progress', uid);
      const progressSnap = await getDoc(progressRef);
      if (progressSnap.exists()) {
        const fetchedProgress = progressSnap.data() as StudentProgress;
        setProgress(fetchedProgress);
        saveLocalBackup(`progress_${uid}`, fetchedProgress);
      } else {
        // Initialize Baseline Progress
        const baselineProgress: StudentProgress = {
          userId: uid,
          streak: 1,
          lastActive: new Date().toISOString(),
          completedHours: 0,
          completedTopics: []
        };
        await setDoc(progressRef, baselineProgress);
        setProgress(baselineProgress);
        saveLocalBackup(`progress_${uid}`, baselineProgress);
      }
    } catch (err) {
      console.warn("Error loading progress, falling back to localStorage:", err);
      const backup = getLocalBackup<StudentProgress | null>(`progress_${uid}`, null);
      if (backup) {
        setProgress(backup);
      } else {
        const baselineProgress: StudentProgress = {
          userId: uid,
          streak: 1,
          lastActive: new Date().toISOString(),
          completedHours: 0,
          completedTopics: []
        };
        setProgress(baselineProgress);
        saveLocalBackup(`progress_${uid}`, baselineProgress);
      }
    }
  };

  // Google Authentication Initiation ( signInWithPopup is iframe safe and white-listed )
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login popup error:", err);
    }
  };

  // Save new student onboarding selection
  const handleCompleteSetup = async () => {
    if (!user) return;
    setLoading(true);

    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || 'Nigerian Scholar',
      email: user.email || '',
      targetExam: initialExam,
      subjects: ['Mathematics', 'English Language', 'Physics'], // Baseline core syllabus pack
      createdAt: new Date().toISOString()
    };

    const baselineProgress: StudentProgress = {
      userId: user.uid,
      streak: 1,
      lastActive: new Date().toISOString(),
      completedHours: 0,
      completedTopics: []
    };

    // Save locally first so user can proceed instantly! (Perfect 3G usability)
    saveLocalBackup(`profile_${user.uid}`, newProfile);
    saveLocalBackup(`progress_${user.uid}`, baselineProgress);
    setProfile(newProfile);
    setProgress(baselineProgress);
    setIsNewUserSetupOpen(false);

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, newProfile);
      await setDoc(doc(db, 'progress', user.uid), baselineProgress);

      // Trigger automatic Welcome Badge unlock
      await unlockBadge("First Seating", "Registered your student profile successfully", "🎓");

      // Reload
      await loadStudentSubData(user.uid, newProfile);
    } catch (err) {
      console.warn("Could not save initial student setup to Cloud, running in resilient local/offline mode:", err);
      // Fallback badges setup locally
      const welcomeBadge: Badge = {
        id: `badge-${Date.now()}`,
        userId: user.uid,
        badgeName: "First Seating",
        description: "Registered your student profile successfully",
        icon: "🎓",
        unlockedAt: new Date().toISOString()
      };
      setBadges([welcomeBadge]);
      saveLocalBackup(`badges_${user.uid}`, [welcomeBadge]);
    } finally {
      setLoading(false);
    }
  };

  // Badge unlock helper
  const unlockBadge = async (name: string, desc: string, icon: string) => {
    if (!user) return;

    // Check if user already has this exact badge by matching title name
    const matches = badges.find(b => b.badgeName === name);
    if (matches) return; // already unlocked

    const newBadge: Badge = {
      id: `badge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user.uid,
      badgeName: name,
      description: desc,
      icon,
      unlockedAt: new Date().toISOString()
    };

    const updatedBadges = [...badges, newBadge];
    setBadges(updatedBadges);
    saveLocalBackup(`badges_${user.uid}`, updatedBadges);

    try {
      await addDoc(collection(db, 'badges'), newBadge);
    } catch (err) {
      console.warn("Failed to unlock badge in firestore, saved locally instead:", err);
    }
  };

  // Callback to register newly launched assessments
  const handleSaveAssessment = async (result: AssessmentResult) => {
    setAssessments(prev => {
      const updated = prev.filter(r => r.subject !== result.subject);
      const nextAssessments = [...updated, result];
      if (user) {
        saveLocalBackup(`assessments_${user.uid}`, nextAssessments);
      }
      return nextAssessments;
    });

    // Trigger assessment badge
    await unlockBadge("Exam Scout", `Scored ${result.score}/5 on raw dynamic ${result.subject} diagnostic quiz`, "📝");
  };

  // Callback to save newly modeled study calendars
  const handleSavePlan = async (newPlan: StudyPlan) => {
    setActivePlan(newPlan);
    if (user) {
      saveLocalBackup(`activePlan_${user.uid}`, newPlan);
    }
    if (newPlan) {
      await unlockBadge("Syllabus Architect", `Compiled 4-week calendar schedule for ${newPlan.subject}`, "📅");
    }
  };

  // Callback to write chat history dynamically
  const handleSaveChatMessage = async (newMessage: ChatMessage) => {
    const nextHistory = [...chatHistory, newMessage];
    setChatHistory(nextHistory);
    if (user) {
      saveLocalBackup(`chatHistory_${user.uid}`, nextHistory);
    }

    // Check if first message was sent to Uncle Chidi to unlock badge
    if (newMessage.sender === 'student' && chatHistory.length === 0) {
      await unlockBadge("Chidi's Nephew", "Started a conversational lecture with Uncle Chidi", "💬");
    }
  };

  // Callback to handle study topic checkbox completion increments
  const handleUpdateProgress = async (hours: number, topicId: string) => {
    if (!user || !progress) return;

    // Estimate new parameters
    const nextHours = Math.max(0, progress.completedHours + hours);
    let nextCompletedTopics = [...progress.completedTopics];

    if (hours > 0) {
      nextCompletedTopics.push(topicId);
      // Unlock progress badges
      await unlockBadge("Curriculum Victor", "Checked off your first high-yield study topic", "🎯");
    } else {
      nextCompletedTopics = nextCompletedTopics.filter(id => id !== topicId);
    }

    const updatedProgress = {
      ...progress,
      completedHours: nextHours,
      completedTopics: nextCompletedTopics,
      lastActive: new Date().toISOString()
    };

    setProgress(updatedProgress);
    saveLocalBackup(`progress_${user.uid}`, updatedProgress);

    // Sync to Firestore progress collection
    try {
      const progressRef = doc(db, 'progress', user.uid);
      await setDoc(progressRef, updatedProgress, { merge: true });
    } catch (err) {
      console.warn("Failed syncing tracking stats to cloud, relying on offline state:", err);
    }
  };

  const getSubjectsPerformanceMap = () => {
    const map: Record<string, number> = {};
    assessments.forEach((res) => {
      map[res.subject] = res.score;
    });
    return map;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* GLOBAL NAVBAR HEADER */}
      <Navbar
        user={user}
        profile={profile}
        streak={progress?.streak || 1}
      />

      {/* RENDER BODY */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 sm:px-6">
        {loading ? (
          <div className="py-24 text-center space-y-3 flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
            <p className="font-sans font-bold text-slate-700 animate-pulse">Loading scholar terminal...</p>
          </div>
        ) : !user ? (
          /* PRE-AUTH WELCOME LANDING CARD HEADER */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-6 sm:py-12">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                <span>Nigerian High School Standard WAEC • NECO • JAMB</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-sans font-extrabold tracking-tight text-slate-900 leading-tight">
                Clear all your papers on one single seating with <span className="text-emerald-600">LearnPath AI</span>.
              </h1>
              
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                Unlock your complete educational edge. Diagnose your weak spots in core curriculum subjects, craft an intensive personalized 4-week study path, and chat with <b>Uncle Chidi</b>—your personal AI tutor who makes difficult principles simple with classic local examples.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  onClick={loginWithGoogle}
                  className="bg-emerald-600 text-white font-sans font-bold hover:bg-emerald-500 px-8 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 duration-200"
                  id="landing-btn-login"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Start Studying For Free</span>
                </button>
              </div>

              {/* Core Features Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div className="flex gap-2.5 items-start">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-semibold text-xs text-slate-800">Syllabus-Aligned Quizzes</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Custom questions custom-built for modern WAEC & JAMB formats.</p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-semibold text-xs text-slate-800">Unyielding Weekly Calendars</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">A customized roadmap detailing what chapters to study step-by-step.</p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start col-span-1 sm:col-span-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-semibold text-xs text-slate-800">Lectures with Uncle Chidi</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">An active mentor explaining electromagnetic fields or sentence structures using local analogies.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Aesthetic Visual Hero Panel Mockup */}
            <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />
              
              <div className="flex items-center justify-between border-b border-rose-50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg font-bold text-xs">U</div>
                  <div>
                    <p className="font-sans font-bold text-xs text-slate-800">Uncle Chidi</p>
                    <p className="text-[9px] text-emerald-600 font-medium">Model Assistant • AI Tutor</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-400">Class Lecture</span>
              </div>

              {/* Chat bubble visuals */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none max-w-[90%] text-xs text-slate-600 leading-relaxed font-sans space-y-2">
                  <p className="font-bold text-emerald-800">"Ah my brilliant child! Let’s represent force and speed easily."</p>
                  <p>Imagine a fully loaded Danfo bus moving from Ikeja to Ojota. If the master driver speeds up suddenly, what forces do the passengers feel when he kicks the brakes?"</p>
                </div>

                <div className="bg-emerald-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] ml-auto text-xs font-sans leading-relaxed">
                  "Passengers will fly forward because of Inertia! Correct, Uncle?"
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none max-w-[90%] text-xs text-slate-600 leading-relaxed font-sans font-bold text-emerald-950">
                  "Oya! You are a brilliant scholar! Correct. That is Newton's First Law. First-Class results loading for you already!"
                </div>
              </div>
            </div>
          </div>
        ) : isNewUserSetupOpen ? (
          /* STUDENT ONBOARDING PANEL */
          <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6 py-10 animate-fade-in text-center">
            <div className="inline-flex justify-center items-center p-4 bg-emerald-50 text-emerald-600 rounded-full mb-3">
              <GraduationCap className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="font-sans font-extrabold text-2xl text-slate-800">Initialize your Scholar Profile</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
                Welcome to LearnPath AI! Tell us which examination syllabus you want to study so we can compile correct material.
              </p>
            </div>

            {/* Onboarding Choices */}
            <div className="grid grid-cols-3 gap-3">
              {(['WAEC', 'NECO', 'JAMB'] as const).map((exam) => {
                const isActive = initialExam === exam;
                return (
                  <button
                    key={exam}
                    onClick={() => setInitialExam(exam)}
                    className={`py-4 rounded-xl border font-sans font-black transition-all ${
                      isActive
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {exam}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                onClick={handleCompleteSetup}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-sm rounded-xl transition-all shadow-md"
                id="btn-complete-onboarding-setup"
              >
                Assemble Learning Copilot
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED WORKSPACE WORKSPACE */
          <div className="space-y-8">
            
            {/* View navigation links */}
            <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none pb-px">
              <div className="flex gap-2 sm:gap-6">
                {[
                  { id: 'dashboard', label: 'Student Dashboard', icon: GraduationCap },
                  { id: 'diagnostic', label: 'AI Diagnostic', icon: HelpCircle },
                  { id: 'planner', label: 'Weekly Study Path', icon: Calendar },
                  { id: 'chat', label: 'Ask Uncle Chidi', icon: MessageSquare },
                  { id: 'settings', label: 'Configure Exam', icon: BookOpen }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (tab.id === 'settings') {
                          setIsSettingsOpen(true);
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      className={`flex items-center gap-1.5 py-4 px-1.5 text-xs sm:text-sm font-sans font-bold border-b-2 hover:text-slate-900 transition-colors ${
                        isActive
                          ? 'border-emerald-600 text-emerald-700'
                          : 'border-transparent text-slate-400'
                      }`}
                      id={`tab-btn-${tab.id}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile Settings Drawer Popup Dialog Modal */}
            {isSettingsOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative">
                  <ProfileSettings
                    profile={profile}
                    onSaveProfile={(updatedProfile) => setProfile(updatedProfile)}
                    onClose={() => setIsSettingsOpen(false)}
                  />
                </div>
              </div>
            )}

            {/* Tab render switcher */}
            <div className="min-h-[400px]">
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  profile={profile}
                  progress={progress}
                  badges={badges}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onOpenSetup={() => setIsSettingsOpen(true)}
                  subjectsPerformance={getSubjectsPerformanceMap()}
                />
              )}

              {activeTab === 'diagnostic' && (
                <DiagnosticTest
                  profile={profile}
                  onSaveAssessment={handleSaveAssessment}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'planner' && (
                <StudyPlanner
                  profile={profile}
                  activePlan={activePlan}
                  assessments={assessments}
                  onSavePlan={handleSavePlan}
                  onUpdateProgress={handleUpdateProgress}
                />
              )}

              {activeTab === 'chat' && (
                <TutorChat
                  profile={profile}
                  activeChatHistory={chatHistory}
                  onSaveMessage={handleSaveChatMessage}
                  onClearHistory={() => setChatHistory([])}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer credits */}
      <footer className="border-t border-slate-100 bg-white py-4 px-6 text-center text-[10px] text-slate-400 font-mono">
        <p>© 2026 LearnPath AI. Aligned to the official Nigerian syllabus (WAEC, NECO, JAMB). Handcrafted for academic excellence.</p>
      </footer>
    </div>
  );
}
