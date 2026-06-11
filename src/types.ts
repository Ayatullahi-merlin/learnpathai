/**
 * Types & Interfaces for LearnPath AI
 */

export type TargetExam = 'WAEC' | 'NECO' | 'JAMB';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  targetExam: TargetExam;
  subjects: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface DiagnosticQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subject: string;
}

export interface AssessmentResult {
  id: string;
  userId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  strengths: string[];
  weaknesses: string[];
  takenAt: string;
}

export interface StudyPlanTopic {
  id: string;
  title: string;
  description: string;
  hoursNeeded: number;
  completed: boolean;
}

export interface StudyPlanWeek {
  weekNumber: number;
  theme: string;
  topics: StudyPlanTopic[];
  tips: string;
}

export interface StudyPlan {
  id?: string;
  userId: string;
  subject: string;
  targetExam: TargetExam;
  weeks: StudyPlanWeek[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id?: string;
  userId: string;
  subject: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

export interface StudentProgress {
  id?: string;
  userId: string;
  streak: number;
  lastActive: string;
  completedHours: number;
  completedTopics: string[]; // Store topic ids that are completed
}

export interface Badge {
  id: string;
  userId: string;
  badgeName: string;
  description: string;
  icon: string;
  unlockedAt: string;
}
