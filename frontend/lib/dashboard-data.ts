// Mock data for the dashboard UI. Replace with API calls (lib/api.ts) as the
// backend endpoints for chats, documents and the planner come online.

export type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
  explain: string;
};

export const QUIZ: QuizQuestion[] = [
  {
    q: "Where in the cell does glycolysis take place?",
    options: ["Mitochondrial matrix", "Cytosol", "Inner mitochondrial membrane", "Nucleus"],
    correct: 1,
    explain:
      "Glycolysis happens in the cytosol. It doesn't need oxygen or mitochondria, which is why it comes first in respiration.",
  },
  {
    q: "How many net ATP molecules does glycolysis produce per glucose?",
    options: ["1", "2", "4", "36"],
    correct: 1,
    explain: "It makes 4 ATP but spends 2, so the net gain is 2.",
  },
  {
    q: "What happens to pyruvate when oxygen is available?",
    options: ["It becomes lactate", "It ferments to ethanol", "It enters the mitochondria", "It is converted to glucose"],
    correct: 2,
    explain: "With oxygen, pyruvate moves into the mitochondria for the Krebs cycle.",
  },
];

export const AGENTS = ["Auto", "Quiz", "Flashcards", "Notes", "Homework", "Research", "Planner"] as const;

export const SUGGESTIONS = ["What's due this week?", "Make flashcards from slide 12", "Summarize Lecture 6"];

export type DocStatus = "Ready" | "Reading";
export const DOCS: { name: string; status: DocStatus }[] = [
  { name: "Bio101_Lecture6.pdf", status: "Ready" },
  { name: "Econ_Notes_Wk3.pdf", status: "Ready" },
  { name: "Chem_Lab_Guide.pdf", status: "Reading" },
];

export const CHATS: { title: string; tone: "mint" | "sky" | "yellow" | "coral" }[] = [
  { title: "Quiz me on week 4", tone: "mint" },
  { title: "Plan my exam week", tone: "sky" },
  { title: "Summarize Lecture 6", tone: "yellow" },
  { title: "Essay outline: climate policy", tone: "coral" },
];

export type EventKind = "study" | "deadline";
export type CalEvent = { date: string; title: string; kind: EventKind };

// Demo "today" so the mock calendar lines up with the events below.
export const TODAY = new Date(2026, 9, 11);

export const EVENTS: CalEvent[] = [
  { date: "2026-10-12", title: "Chem lab report", kind: "deadline" },
  { date: "2026-10-13", title: "Bio101 review", kind: "study" },
  { date: "2026-10-15", title: "Bio101 quiz", kind: "study" },
  { date: "2026-10-18", title: "Econ essay draft", kind: "deadline" },
];
