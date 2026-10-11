/**
 * Password rules shown while choosing a password. Only `required` ones
 * block the form — and that one mirrors the backend (8 to 128 characters,
 * see UserCreate in backend/app/schemas/auth.py), so the form never
 * promises something the API will then refuse. The rest only feed the
 * strength meter.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type PasswordRule = {
  id: string;
  label: string;
  required: boolean;
  met: boolean;
};

export function checkPassword(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN} characters`,
      required: true,
      met: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    },
    {
      id: "case",
      label: "Upper and lower case letters",
      required: false,
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { id: "number", label: "A number", required: false, met: /\d/.test(password) },
    {
      id: "symbol",
      label: "A symbol, or 12+ characters",
      required: false,
      met: /[^A-Za-z0-9]/.test(password) || password.length >= 12,
    },
  ];
}

export function isPasswordAcceptable(password: string): boolean {
  return checkPassword(password).every((rule) => !rule.required || rule.met);
}

/** 0 (empty) to 4. A password under the minimum length never scores above 1. */
export function passwordStrength(password: string): number {
  if (password.length === 0) return 0;
  const rules = checkPassword(password);
  if (!rules[0].met) return 1;
  return Math.max(1, rules.filter((rule) => rule.met).length);
}

export const STRENGTH_LABELS = ["Pick a password", "Too weak", "Okay", "Good", "Strong"] as const;
