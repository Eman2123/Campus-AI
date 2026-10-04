import type { ChatMessage } from "@/lib/chat";

// Same six agents as the landing page's AgentCards, plus the two Phase 3
// specialists (document, planner) that don't appear there.
const AGENT_LABELS: Record<string, string> = {
  research: "Research",
  homework: "Homework Helper",
  quiz: "Quiz",
  notes: "Notes",
  flashcard: "Flashcards",
  feedback: "Feedback",
  document: "Document",
  planner: "Planner",
};

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-sm px-4 py-3 font-sans text-sm leading-relaxed ${
          isUser ? "bg-highlighter text-ink" : "bg-paper text-ink"
        }`}
      >
        {!isUser && message.agentUsed && (
          <p className="mb-1 font-sans text-xs font-medium text-noteDark-periwinkle">
            {AGENT_LABELS[message.agentUsed] ?? message.agentUsed}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
