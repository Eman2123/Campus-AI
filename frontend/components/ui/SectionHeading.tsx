type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: "dark" | "paper";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "dark",
}: SectionHeadingProps) {
  const isDark = tone === "dark";

  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p
          className={`mb-3 font-sans text-sm ${
            isDark ? "text-note-periwinkle" : "text-noteDark-coral"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`font-display text-3xl leading-tight sm:text-4xl ${
          isDark ? "text-paper" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 font-sans text-base leading-relaxed ${
            isDark ? "text-muted-onDark" : "text-muted-onPaper"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
