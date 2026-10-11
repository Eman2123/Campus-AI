"use client";

import { useId, useState } from "react";

import { PixelInput } from "@/components/pixel";
import { cn } from "@/lib/cn";
import { checkPassword, passwordStrength, STRENGTH_LABELS } from "@/lib/password";

type PasswordFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  /** Show the rules checklist and strength blocks (sign-up / reset). */
  showRules?: boolean;
  labelAside?: React.ReactNode;
  error?: string | null;
  placeholder?: string;
};

const BLOCK_TONES = ["", "bg-accent-coral", "bg-brand-yellow", "bg-accent-sky", "bg-accent-mint"];

export function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete,
  showRules = false,
  labelAside,
  error,
  placeholder,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const rulesId = useId();
  const strength = passwordStrength(value);
  const rules = checkPassword(value);

  return (
    <div className="flex flex-col gap-3">
      <PixelInput
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        error={error}
        labelAside={labelAside}
        aria-describedby={showRules ? rulesId : undefined}
        action={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            className="pixel-focus h-9 border-2 border-brand-black bg-brand-white px-2.5 font-pixel text-xs font-semibold"
          >
            {visible ? "Hide" : "Show"}
          </button>
        }
      />
      {showRules && (
        <div id={rulesId} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={cn("h-2.5 border-2 border-brand-black", n <= strength ? BLOCK_TONES[strength] : "bg-brand-white")}
                />
              ))}
            </div>
            <span className="w-28 text-right font-pixel text-xs font-semibold" aria-live="polite">
              {STRENGTH_LABELS[strength]}
            </span>
          </div>
          <ul className="grid gap-1 font-sans text-sm sm:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center border-2 border-brand-black text-[10px] font-bold leading-none",
                    rule.met ? "bg-accent-mint" : "bg-brand-white",
                  )}
                >
                  {rule.met ? "✓" : ""}
                </span>
                <span className={rule.met ? "" : "text-muted-onPaper"}>
                  {rule.label}
                  <span className="sr-only">{rule.met ? " (done)" : rule.required ? " (required)" : " (optional)"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
