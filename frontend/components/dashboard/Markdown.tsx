"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Styled to the pixel design system. Raw HTML in model output is NOT rendered
// (react-markdown ignores it by default), so this is safe for LLM text.
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h3 className="mb-1 mt-3 font-pixel text-lg font-bold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-1 mt-3 font-pixel text-base font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-3 font-pixel text-sm font-bold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mb-1 mt-3 font-pixel text-sm font-bold first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="pixel-focus font-semibold underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="my-2 border-l-4 border-brand-black bg-brand-yellow-soft px-3 py-1">{children}</blockquote>,
  hr: () => <hr className="my-3 border-t-2 border-brand-black" />,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto border-2 border-brand-black bg-brand-black p-3 text-xs text-brand-white">{children}</pre>,
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="border border-brand-black bg-brand-yellow-soft px-1 py-0.5 text-[0.85em]">{children}</code>
    ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse border-2 border-brand-black text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-2 border-brand-black bg-brand-yellow px-2 py-1 text-left font-bold">{children}</th>,
  td: ({ children }) => <td className="border-2 border-brand-black px-2 py-1 align-top">{children}</td>,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
