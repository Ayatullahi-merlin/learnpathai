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

// Helper to safely execute a generateContent request with retries and fallback
async function generateContentWithRetry(params: { model: string; contents: any; config?: any }, retries = 3, delayMs = 1500) {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = err?.message || '';
      const isUnavailable = errMsg.includes('503') || 
                            errMsg.toUpperCase().includes('UNAVAILABLE') || 
                            err?.status === 503 ||
                            err?.statusCode === 503 ||
                            JSON.stringify(err).includes('503') ||
                            JSON.stringify(err).toUpperCase().includes('UNAVAILABLE');

      console.warn(`[Gemini API] Attempt ${attempt + 1} failed for model "${params.model}". Error: ${errMsg}`);

      if (attempt < retries) {
        attempt++;
        // Switch to high-availability stable/latest fallback model if current model is gemini-3.5-flash and we receive UNAVAILABLE/503
        if (isUnavailable && params.model === 'gemini-3.5-flash') {
          console.log(`[Gemini API] Automatically switching model from "gemini-3.5-flash" to "gemini-flash-latest" to bypass high demand.`);
          params.model = 'gemini-flash-latest';
        }
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        console.log(`[Gemini API] Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }
}

// HELPER FUNCTIONS FOR SYLLABUS-ALIGNED FALLBACK QUESTIONS AND STUDY PLANS
function getFallbackQuestions(subject: string, exam: string) {
  const normSubject = (subject || '').trim().toLowerCase();
  const examName = (exam || 'WAEC').toUpperCase();

  if (normSubject.includes('math')) {
    return [
      {
        id: `math-q1-${Date.now()}`,
        question: `Evaluate the following expression: (27)^(1/3) \\times (16)^(-1/4) in accordance with standard ${examName} Indices rules.`,
        options: ["1.5", "2.0", "0.5", "3.0"],
        correctIndex: 0,
        explanation: `Excellent! (27)^(1/3) is the cube root of 27, which is 3. (16)^(-1/4) is 1 over the fourth root of 16, which is 1/2. Therefore, 3 \\times 1/2 = 1.5. This is a very frequent question type in both JAMB and WAEC.`,
        subject: subject
      },
      {
        id: `math-q2-${Date.now()}`,
        question: `Find the quadratic equation whose roots are -2 and 3.`,
        options: ["x² - x - 6 = 0", "x² + x - 6 = 0", "x² - 5x + 6 = 0", "x² + 5x - 6 = 0"],
        correctIndex: 0,
        explanation: `Perfect! For roots α and β, the quadratic equation is given by x² - (α + β)x + αβ = 0. Here, α + β = -2 + 3 = 1, and αβ = (-2)(3) = -6. Thus, x² - (1)x + (-6) = 0, which reduces to x² - x - 6 = 0.`,
        subject: subject
      },
      {
        id: `math-q3-${Date.now()}`,
        question: `In a right-angled triangle, if the longest side (hypotenuse) is 13 cm and the adjacent side is 12 cm, what is the length of the opposite side?`,
        options: ["5 cm", "7 cm", "8 cm", "10 cm"],
        correctIndex: 0,
        explanation: `Correct! By applying Pythagoras' Theorem: Opp² = Hyp² - Adj². Thus, Opp² = 13² - 12² = 169 - 144 = 25. Taking the square root of 25 yields 5 cm.`,
        subject: subject
      },
      {
        id: `math-q4-${Date.now()}`,
        question: `Evaluate matching the curriculum format: log₁₀(25) + log₁₀(8) - log₁₀(2).`,
        options: ["2", "1.5", "3", "4"],
        correctIndex: 0,
        explanation: `Brilliant! According to log rules: log(A) + log(B) - log(C) = log((A × B) / C). So log₁₀((25 × 8) / 2) = log₁₀(200 / 2) = log₁₀(100) = 2.`,
        subject: subject
      },
      {
        id: `math-q5-${Date.now()}`,
        question: `A fair six-sided die is rolled once. What is the probability of obtaining a prime number?`,
        options: ["1/2", "1/3", "2/3", "1/6"],
        correctIndex: 0,
        explanation: `Spot on! The prime numbers on a die are 2, 3, and 5 (three possibilities). The total possible outcomes are 6. Hence, the probability is 3/6, which simplifies perfectly to 1/2.`,
        subject: subject
      }
    ];
  }

  if (normSubject.includes('eng') || normSubject.includes('literature')) {
    return [
      {
        id: `eng-q1-${Date.now()}`,
        question: `Choose the option nearest in meaning to the italicized word in this ${examName} sentence: 'The Principal was brief, and his speech was highly *succinct*.'`,
        options: ["concise and clear", "loud and dramatic", "unnecessarily tedious", "extremely controversial"],
        correctIndex: 0,
        explanation: `Superb! 'Succinct' means briefly and clearly expressed. It is nearest in meaning to 'concise and clear'.`,
        subject: subject
      },
      {
        id: `eng-q2-${Date.now()}`,
        question: `Choose the option opposite in meaning to the italicized word: 'The young high school athlete is surprisingly *loquacious*.'`,
        options: ["taciturn and reserved", "brilliant and responsive", "agile and fast", "highly gregarious"],
        correctIndex: 0,
        explanation: `Excellent! 'Loquacious' means talkative. Its opposite is 'taciturn' (speaking very little, or reserved).`,
        subject: subject
      },
      {
        id: `eng-q3-${Date.now()}`,
        question: `Complete the sentence with the correct Concord option: 'Each of the graduating high school boys _______ been assigned a sitting position.'`,
        options: ["has", "have", "were", "are"],
        correctIndex: 0,
        explanation: `Perfect! 'Each' is a singular pronoun and always takes a singular verb ('has'). Even though it is followed by the plural noun 'boys', the subject remains 'Each'.`,
        subject: subject
      },
      {
        id: `eng-q4-${Date.now()}`,
        question: `Identify the correct idiomatic interpretation: 'The class captain's accusation turned out to be a *storm in a teacup*.'`,
        options: ["a lot of anger and worry about a trivial matter", "a highly dangerous secondary class riot", "a masterpiece joke", "a clever political move"],
        correctIndex: 0,
        explanation: `Correct! A 'storm in a teacup' refers to an unnecessary or disproportionate amount of excitement, anger, or worry about a minor issue.`,
        subject: subject
      },
      {
        id: `eng-q5-${Date.now()}`,
        question: `Choose the appropriate preposition to complete the clause: 'The student was warmly congratulated _______ his outstanding WAEC achievement.'`,
        options: ["on", "for", "at", "about"],
        correctIndex: 0,
        explanation: `Brilliant! In standard English grammar/concord, we congratulate someone 'on' their success, not 'for' it. This is a common past question trap in JAMB and WAEC.`,
        subject: subject
      }
    ];
  }

  if (normSubject.includes('phys')) {
    return [
      {
        id: `phys-q1-${Date.now()}`,
        question: `Which of the following is a fundamental physical quantity under the SI system?`,
        options: ["Luminous intensity", "Force", "Velocity", "Acceleration"],
        correctIndex: 0,
        explanation: `Correct! Luminous intensity is one of the seven basic fundamental quantities. Velocity, force, and acceleration are derived physical quantities.`,
        subject: subject
      },
      {
        id: `phys-q2-${Date.now()}`,
        question: `A sound wave has a frequency of 500 Hz and travels at a speed of 330 m/s in air. Calculate its wavelength.`,
        options: ["0.66 m", "1.51 m", "165.0 m", "0.33 m"],
        correctIndex: 0,
        explanation: `Perfect! Using the wave speed formula: v = f \\times \\lambda, where v is speed, f is frequency, and \\lambda is wavelength. Therefore, \\lambda = v / f = 330 / 500 = 0.66 m.`,
        subject: subject
      },
      {
        id: `phys-q3-${Date.now()}`,
        question: `A concave mirror can form a real, magnified image of an object when the object is placed:`,
        options: ["Between the principal focus and the center of curvature", "At the principal focus", "Beyond the center of curvature", "Between the pole and principal focus"],
        correctIndex: 0,
        explanation: `Excellent! Placed between F and C, the concave mirror forms a real, inverted, and magnified image beyond C. Placed between P and F, the image would be virtual and magnified.`,
        subject: subject
      },
      {
        id: `phys-q4-${Date.now()}`,
        question: `Three identical 6-ohm electrical resistors are connected in parallel. What is their combined net effective resistance?`,
        options: ["2 Ω", "18 Ω", "9 Ω", "0.5 Ω"],
        correctIndex: 0,
        explanation: `Brilliant! For parallel resistors: 1/R = 1/R₁ + 1/R₂ + 1/R₃ = 1/6 + 1/6 + 1/6 = 3/6 = 1/2. Inverting this gives R = 2 ohms.`,
        subject: subject
      },
      {
        id: `phys-q5-${Date.now()}`,
        question: `The half-life of a radioactive substance is 4 days. What fraction of the original sample will remain after 12 days?`,
        options: ["1/8", "1/16", "1/4", "1/2"],
        correctIndex: 0,
        explanation: `Spot on! 12 days represents exactly 3 half-lives (12/4 = 3). After one half-life, 1/2 remains; after two, 1/4 remains; after three, (1/2)^3 = 1/8 remains.`,
        subject: subject
      }
    ];
  }

  if (normSubject.includes('chem')) {
    return [
      {
        id: `chem-q1-${Date.now()}`,
        question: `Which gas law states that at constant temperature, the volume of a fixed mass of gas is inversely proportional to its pressure?`,
        options: ["Boyle's Law", "Charles's Law", "Avogadro's Law", "Graham's Law"],
        correctIndex: 0,
        explanation: `Perfect! Boyle's Law states that P₁V₁ = P₂V₂ at constant temperature. Charles's Law relates volume and temperature at constant pressure.`,
        subject: subject
      },
      {
        id: `chem-q2-${Date.now()}`,
        question: `The electronic configuration of an element with atomic number 17 (Chlorine) is:`,
        options: ["2, 8, 7", "2, 8, 8", "2, 8, 5", "2, 8, 6"],
        correctIndex: 0,
        explanation: `Perfect! 17 electrons are filled as: first shell takes 2, second shell takes 8, and the outer third shell takes the remaining 7.`,
        subject: subject
      },
      {
        id: `chem-q3-${Date.now()}`,
        question: `Determine the number of moles present in 4.0 g of Sodium Hydroxide (NaOH). [Atomic masses: Na = 23, O = 16, H = 1]`,
        options: ["0.1 mol", "1.0 mol", "0.25 mol", "0.4 mol"],
        correctIndex: 0,
        explanation: `Great job! Molar mass of NaOH = 23 + 16 + 1 = 40 g/mol. Number of moles = mass / molar mass = 4.0 / 40 = 0.1 moles.`,
        subject: subject
      },
      {
        id: `chem-q4-${Date.now()}`,
        question: `Which of the following elements belongs to Group 18 of the periodic table, being an inert/noble gas?`,
        options: ["Argon", "Fluorine", "Nitrogen", "Oxygen"],
        correctIndex: 0,
        explanation: `Correct! Argon is a Group 18 noble gas with a stable octet outer shell (8 valence electrons).`,
        subject: subject
      },
      {
        id: `chem-q5-${Date.now()}`,
        question: `Methyl orange indicator transitions to what color when added to a highly acidic medium?`,
        options: ["Red/Pink", "Yellow", "Orange", "Colorless"],
        correctIndex: 0,
        explanation: `Superb! Methyl orange is red/pink in acidic solutions, and transitions to yellow in alkaline ones.`,
        subject: subject
      }
    ];
  }

  if (normSubject.includes('biol')) {
    return [
      {
        id: `biol-q1-${Date.now()}`,
        question: `Which of the following cellular organelles is universally known as the powerhouse of the cell?`,
        options: ["Mitochondrion", "Ribosome", "Nucleus", "Chloroplast"],
        correctIndex: 0,
        explanation: `Correct! Mitochondria are the sites of cellular respiration, generating chemical energy (ATP) for the cell.`,
        subject: subject
      },
      {
        id: `biol-q2-${Date.now()}`,
        question: `What reagent is used to test for the presence of starch in standard nutritional practicals?`,
        options: ["Iodine solution", "Fehling's solution", "Millon's reagent", "Benedict's solution"],
        correctIndex: 0,
        explanation: `Excellent! Iodine solution is blue-black in the presence of starch. Fehling's and Benedict's test for reducing sugars.`,
        subject: subject
      },
      {
        id: `biol-q3-${Date.now()}`,
        question: `If a heterozygous tall pea plant (Tt) is crossed with a homozygous short plant (tt), what percentage of offspring will be short?`,
        options: ["50%", "25%", "75%", "100%"],
        correctIndex: 0,
        explanation: `Correct! Tt × tt cross yields: 50% Tt (heterozygous tall) and 50% tt (homozygous short) offspring. This is a classic Mendelian monohybrid cross question on WAEC and JAMB.`,
        subject: subject
      },
      {
        id: `biol-q4-${Date.now()}`,
        question: `The living components of an ecosystem are classified under which of the following terms?`,
        options: ["Biotic factors", "Abiotic factors", "Edaphic factors", "Climatic factors"],
        correctIndex: 0,
        explanation: `Correct! 'Biotic' refers to living organisms (plants, animals, microbes). Abiotic refers to non-living elements like temperature or rocks.`,
        subject: subject
      },
      {
        id: `biol-q5-${Date.now()}`,
        question: `Which blood component is primarily responsible for the transport of oxygen in the human circulatory network?`,
        options: ["Erythrocytes (Red Blood Cells)", "Leucocytes (White Blood Cells)", "Thrombocytes (Platelets)", "Lymphocytes"],
        correctIndex: 0,
        explanation: `Brilliant! Erythrocytes contain hemoglobin, which reversibly binds to oxygen molecules and distributes them to tissues across the body.`,
        subject: subject
      }
    ];
  }

  // General subjects fallback
  return [
    {
      id: `gen-q1-${Date.now()}`,
      question: `What is the most effective approach to prepare for the upcoming ${examName} in ${subject || 'your subjects'}?`,
      options: ["Active recall, spaced repetition, and thorough practice with official past questions", "Rote-memorization of answers without reviewing the fundamental explanations", "Reading the entire syllabus textbook only once without carrying out self-tests", "Hoping the question themes match short summaries found online"],
      correctIndex: 0,
      explanation: `Excellent! Study science shows active self-testing and solving historic examination past questions under simulated timed environments is 300% more effective than passive reading.`,
      subject: subject
    },
    {
      id: `gen-q2-${Date.now()}`,
      question: `When dealing with challenging topics in the official ${examName} syllabus, what should a candidate do?`,
      options: ["Break the topics down into bite-sized modules and study them early", "Skip them completely with the hope that only simple concepts are queried", "Memorize definitions without understanding actual calculations", "Wait for exam day to try to guess formulas"],
      correctIndex: 0,
      explanation: `Correct! Difficult syllabus subjects carry high mark weightage. Tackling them early, seeking tutor explanations, and breaking them down systematically ensures a solid foundation.`,
      subject: subject
    },
    {
      id: `gen-q3-${Date.now()}`,
      question: `To master the Computer-Based Test (CBT) interface used in ${examName} exams, which preparation drill is critical?`,
      options: ["Engaging in timed practice mock tests to improve keyboard speed and time management", "Writing out answers on physical papers over and over", "Reading questions as fast as possible without choosing answers", "Memorizing the key positions on a standard keyboard layout"],
      correctIndex: 0,
      explanation: `Brilliant! Familiarizing yourself with timed CBT interfaces helps reduce test-day anxiety, adjusts your pacing to roughly 40-50 seconds per question, and increases accurate navigation speed.`,
      subject: subject
    },
    {
      id: `gen-q4-${Date.now()}`,
      question: `If a student makes persistent mistakes during self-assessment practice quizzes, what is the best remedial action?`,
      options: ["Analyze the incorrect responses to pinpoint knowledge gaps and study the relevant explanations", "Ignore the errors and instantly proceed to a different topic test", "Feel fully discouraged and conclude the subject is too hard", "Assume the diagnostic test's answers are wrong"],
      correctIndex: 0,
      explanation: `Great job! Reviewing wrong answers is the single most valuable part of diagnostic testing. It prevents repeating the same conceptual mistakes on the actual exam.`,
      subject: subject
    },
    {
      id: `gen-q5-${Date.now()}`,
      question: `Which primary syllabus pillars yields the highest return on investment during revision weeks?`,
      options: ["Consolidating fundamental definitions and key processes, then checking how they apply in past questions", "Memorizing the copyright details of the textbook", "Studying only topics in week 1 and skipping weeks 2, 3, and 4", "Relying on external group discussion notes instead of the official syllabus guidelines"],
      correctIndex: 0,
      explanation: `Spot on! Understanding key definitions and core application laws equips you to handle varied question structures and tricky exam traps on the main day.`,
      subject: subject
    }
  ];
}

function getFallbackStudyPlan(subject: string, exam: string, strengths: string[], weaknesses: string[]) {
  const subName = subject || 'Mathematics';
  const examName = (exam || 'WAEC').toUpperCase();
  const rawWeak = weaknesses && weaknesses.length ? weaknesses.join(', ') : 'core topics';

  return {
    subject: subName,
    targetExam: examName,
    weeks: [
      {
        weekNumber: 1,
        theme: `Foundation Building: Core concepts of ${subName}`,
        topics: [
          {
            id: `plan-t1-${Date.now()}`,
            title: `Syllabus Introduction & Basic Principles`,
            description: `Review fundamental rules, standard definitions, and high-yield concepts associated with ${subName}, focusing on addressed weaknesses in ${rawWeak}.`,
            hoursNeeded: 6,
            completed: false
          },
          {
            id: `plan-t2-${Date.now()}`,
            title: `Essential Formula & Concept Drills`,
            description: `Work through simpler textbook exercises and sample problems. Focus on building speed and high accuracy in these basics.`,
            hoursNeeded: 4,
            completed: false
          }
        ],
        tips: `For ${examName}, always read the question twice before writing out the steps. Underline keywords so you do not jump to assumptions.`
      },
      {
        weekNumber: 2,
        theme: `Remedial Module: Tackling Identified Weaknesses`,
        topics: [
          {
            id: `plan-t3-${Date.now()}`,
            title: `Intense Focus on Weak Zones`,
            description: `Deep dive into subtopics related to: ${rawWeak}. Bridge the gaps using active textbook references or your tutor chat with 'Uncle Chidi'.`,
            hoursNeeded: 8,
            completed: false
          },
          {
            id: `plan-t4-${Date.now()}`,
            title: `Intermediate Subject Applications`,
            description: `Practice multi-concept questions. Many ${examName} questions combine two aspects, so test your ability to link them.`,
            hoursNeeded: 5,
            completed: false
          }
        ],
        tips: `Do not run away from challenging modules! Spend 15 minutes reviewing active examples, then try to replicate them without looking.`
      },
      {
        weekNumber: 3,
        theme: `Speed Drilling: Past Question Systems`,
        topics: [
          {
            id: `plan-t5-${Date.now()}`,
            title: `Reviewing 5-Year Past Questions`,
            description: `Solve past exam packs chronologically. Analyze the grading system and mark weightage for each core module.`,
            hoursNeeded: 7,
            completed: false
          },
          {
            id: `plan-t6-${Date.now()}`,
            title: `CBT Interface Simulation`,
            description: `Practice answering simulated options quickly. Set your timer to 45 seconds per question to build rapid response timing.`,
            hoursNeeded: 5,
            completed: false
          }
        ],
        tips: `If you are preparing for JAMB CBT, practice executing calculations on draft papers very cleanly to avoid simple numerical errors.`
      },
      {
        weekNumber: 4,
        theme: `Final Preparation & Mock Assessment`,
        topics: [
          {
            id: `plan-t7-${Date.now()}`,
            title: `Full Curriculum Diagnostic Review`,
            description: `Revise key summary notes, laws, constants, and recurring diagrams. Clean up residual doubts.`,
            hoursNeeded: 6,
            completed: false
          },
          {
            id: `plan-t8-${Date.now()}`,
            title: `Full-Scale Mock Exam Under Timed Conditions`,
            description: `Take a 50-question mock assessment. This acts as the final validation of your exam readiness!`,
            hoursNeeded: 4,
            completed: false
          }
        ],
        tips: `Success is yours! A balanced sleep is just as important as studying the night before the exam. Relax, eat well, and go conquer!`
      }
    ]
  };
}

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

      const response = await generateContentWithRetry({
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
      console.warn('Gemini generate-diagnostic error, activating syllabus database fallback:', err);
      try {
        const fallbackQuestions = getFallbackQuestions(subject, exam);
        res.json({ questions: fallbackQuestions, isFallback: true });
      } catch (fallbackErr: any) {
        res.status(500).json({ error: err.message || 'Failed to generate diagnostic exam questions.' });
      }
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

      const response = await generateContentWithRetry({
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
      console.warn('Gemini generate-plan error, activating personal study-calendar fallback:', err);
      try {
        const fallbackPlan = getFallbackStudyPlan(subject, exam, strengths || [], weaknesses || []);
        res.json({ plan: fallbackPlan, isFallback: true });
      } catch (fallbackErr: any) {
        res.status(500).json({ error: err.message || 'Failed to generate your personalized study guide.' });
      }
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

      const response = await generateContentWithRetry({
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
      console.warn('Gemini tutor chat error, returning supportive Uncle Chidi offline coach speech:', err);
      const chidiFallback = `Ah! My excellent student, it looks like our digital network signal is waving to us from a distance, or the main server is catching its breath (probably NEPA turned off their transformer!). 

But worry not! A true genius is never stranded. Let me share some highly strategic advice with you:

*   **For ${subject || 'your studies'}**: Focus heavily on mastering the fundamental principles instead of cramming answers. WAEC and JAMB examiners love testing how you apply laws in everyday scenarios.
*   **Active Recall**: After reading a section, close the book and try to explain it to an imaginary friend. If you can explain it simply, you have truly mastered it!
*   **Solving Past Questions**: This is the ultimate secret weapon. Solve at least 5 years of past papers. It helps you recognize repeating exam patterns instantly.

Your question: *"${message}"* has been noted down in our syllabus workbook! Ask me another question, and as soon as the network stabilizes, we will dissect it formula-by-formula! Keep pushing, I am fully proud of your hard work! 🎓💪`;
      res.json({ text: chidiFallback, isFallback: true });
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
