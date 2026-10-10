/**
 * Single index of all landing-page art (WebP, transparent).
 * Use with next/image: <Image src={ASSETS.hero.robot.src} width={...} height={...} alt={ASSETS.hero.robot.alt} />
 * Squares are 640x640 (hero 900x900); the problem desk is wide (905x739).
 */
type Asset = { src: string; width: number; height: number; alt: string };

const sq = (src: string, alt: string, size = 640): Asset => ({ src, width: size, height: size, alt });

export const ASSETS = {
  hero: {
    robot: sq("/assets/hero/robot-study-buddy.webp", "Campus AI study buddy robot holding a book and a laptop", 900),
  },
  problem: {
    desk: { src: "/assets/misc/problem-desk.webp", width: 905, height: 739, alt: "Messy study desk with deadlines and scattered notes" } as Asset,
  },
  steps: {
    upload: sq("/assets/steps/upload.webp", "Upload your notes"),
    ask: sq("/assets/steps/ask.webp", "Ask a question"),
    answer: sq("/assets/steps/answer.webp", "Get a checked answer"),
  },
  agents: {
    research: sq("/assets/agents/research.webp", "Research agent"),
    homework: sq("/assets/agents/homework.webp", "Homework agent"),
    quizzes: sq("/assets/agents/quizzes.webp", "Quiz agent"),
    notes: sq("/assets/agents/notes.webp", "Notes agent"),
    flashcards: sq("/assets/agents/flashcards.webp", "Flashcards agent"),
    studyPlan: sq("/assets/agents/study-plan.webp", "Study plan agent"),
  },
  planner: {
    calendar: sq("/assets/misc/planner-calendar.webp", "Study planner calendar"),
  },
  docs: {
    pdf: sq("/assets/misc/docs-pdf.webp", "PDF and document uploads"),
    mic: sq("/assets/misc/voice-mic.webp", "Voice input microphone"),
  },
  extra: {
    computer: sq("/assets/misc/computer.webp", "Retro computer terminal (optional, chat demo)"),
  },
} as const;
