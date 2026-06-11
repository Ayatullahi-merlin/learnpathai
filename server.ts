import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

// Load environmental variables
dotenv.config();

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: DEFAULT_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Verify backend and key state
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // API Route: Create Personalized Diagnostic Diagnostic Quiz (Syllabus Aligned)
  app.post('/api/generate-diagnostic', async (req, res) => {
    const { subject, exam } = req.body;

    if (!subject || !exam) {
      return res.status(400).json({ error: 'Subject and reference target exam (WAEC, NECO, or JAMB) are required.' });
    }

    try {
      const prompt = `Generate a 5-question multi-choice diagnostic assessment test for Nigerian high school students preparing for the ${exam} exam in the subject: ${subject}. 
      The questions must closely match the official ${exam} syllabus. Focus on testing different curriculum modules.
      Ensure the terminology, spelling, and phrasing are natural for Nigerian schools (WAEC/NECO/JAMB standard). 
      Provide 4 plausible multi-choice options for each question, indicate the correct option index (0 to 3), and give an educational, highly encouraging explanation explaining why that option is correct.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an elite, WAEC, NECO, and JAMB curriculum specialist and senior secondary school educator in Nigeria. You craft pristine, syllabus-correct multiple-choice exam questions.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of diagnostic assessment questions matching Nigeria school syllabus.',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'Unique question id' },
                question: { type: Type.STRING, description: 'The official style multiple choice question' },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Four multi choice custom-designed answers'
                },
                correctIndex: { type: Type.INTEGER, description: 'Index of correct answer from 0 to 3' },
                explanation: { type: Type.STRING, description: 'Rich feedback explaining correct solution' },
                subject: { type: Type.STRING, description: 'Subject area' }
              },
              required: ['id', 'question', 'options', 'correctIndex', 'explanation', 'subject']
            }
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No content returned from the Gemini AI diagnostic generator.');
      }

      const questions = JSON.parse(responseText.trim());
      res.json({ questions });
    } catch (err: any) {
      console.error('Gemini generate-diagnostic error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate diagnostic exam questions.' });
    }
  });

  // API Route: Personal Study Plan Calendar Generation (Syllabus Aligned)
  app.post('/api/generate-plan', async (req, res) => {
    const { subject, exam, score, totalQuestions, strengths, weaknesses } = req.body;

    if (!subject || !exam) {
      return res.status(400).json({ error: 'Subject and reference target exam (WAEC, NECO, or JAMB) are required.' });
    }

    try {
      const prompt = `Create an intensive 4-week study calendar plan for a Nigerian student preparing for their ${exam} exam in the subject: ${subject}.
      The student has completed a diagnostic quiz scoring ${score}/${totalQuestions}.
      Strengths identified: ${strengths && strengths.length ? strengths.join(', ') : 'General baseline topics'}.
      Weaknesses identified: ${weaknesses && weaknesses.length ? weaknesses.join(', ') : 'Needs general syllabus refresher'}.
      
      Structure the output exactly into 4 distinct weeks. Provide a specific, highly prioritized themes and subtopics for each week that addresses these weaknesses.
      Give advice and custom tips specific to Nigerian students targeting WAEC, NECO, or JAMB (e.g. focusing on practical exams for WAEC/NECO science subjects, past questions drill systems, or JAMB's rapid computer-based test formats).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an advanced academic counselor and coordinator for WAEC/NECO/JAMB prep academies in Nigeria.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              targetExam: { type: Type.STRING },
              weeks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    weekNumber: { type: Type.INTEGER },
                    theme: { type: Type.STRING, description: 'Primary weekly focus topic area' },
                    topics: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          hoursNeeded: { type: Type.INTEGER },
                          completed: { type: Type.BOOLEAN }
                        },
                        required: ['id', 'title', 'description', 'hoursNeeded', 'completed']
                      }
                    },
                    tips: { type: Type.STRING, description: 'Practical WAEC/JAMB specific tips and focus highlights' }
                  },
                  required: ['weekNumber', 'theme', 'topics', 'tips']
                }
              }
            },
            required: ['subject', 'targetExam', 'weeks']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No content returned from the Gemini AI study planner.');
      }

      const plan = JSON.parse(responseText.trim());
      res.json({ plan });
    } catch (err: any) {
      console.error('Gemini generate-plan error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate your personalized study guide.' });
    }
  });

  // API Route: AI Tutor Conversational Assistant ("Uncle Chidi" - Local Context)
  app.post('/api/chat-tutor', async (req, res) => {
    const { subject, history, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message input from student is required.' });
    }

    try {
      const formattedHistory = (history || []).map((msg: any) => ({
        role: msg.sender === 'student' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      // System greeting containing Uncle Chidi's persona
      const systemInstruction = `You are "Uncle Chidi", a passionate, incredibly supportive, and highly experienced AI Tutor for Nigerian students preparing for WAEC, NECO, and JAMB.
      You explain complex topics using friendly, highly relatable Nigerian comparisons, jokes, and expressions (such as using public transport 'Danfo', local foods 'Jollof rice', purchasing in 'Naira', school scenarios, electricity situations, etc.).
      Be extremely encouraging, never talk down on students. Address them warmly (e.g. "My friend", "Great student"). 
      When they ask a question regarding ${subject || 'their studies'}, break down the exact principles, formulas, or concepts step-by-step.
      Always focus on high-yield exam tips relevant for WAEC/NECO (theory and practicals) and JAMB (rapid CBT systems). Keep responses clean and formatted using bullet points for key definitions and bold accents. Avoid heavy developer jargon, speak like a brilliant local mentor.`;

      // We use ai.models.generateContent with chat structure in contents
      const contents = [...formattedHistory, { role: 'user', parts: [{ text: message }] }];

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || 'Ah, let me check that formula again. Ask me another question while I look into it!';
      res.json({ text: reply });
    } catch (err: any) {
      console.error('Gemini tutor chat error:', err);
      res.status(500).json({ error: err.message || 'Uncle Chidi is thinking. Please try again in a moment.' });
    }
  });

  // Serve Static Frontend Assets or development Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LearnPath AI backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
