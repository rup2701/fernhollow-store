import type { PersonalizationRule } from "@/db/schema";

/** Letters (any language), numbers, spaces and a few safe punctuation marks. */
const ALLOWED = /^[\p{L}\p{N} &.,'-]*$/u;

export function normalizePersonalization(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Returns an error message, or null when the value is acceptable. Empty is always allowed (it's optional). */
export function validatePersonalization(value: string, rule: PersonalizationRule): string | null {
  const v = normalizePersonalization(value);
  if (v.length === 0) return null;
  if (v.length > rule.maxLength) return `${rule.label} can be at most ${rule.maxLength} characters.`;
  if (!ALLOWED.test(v)) return `${rule.label} can only use letters, numbers, spaces and & . , ' -`;
  return null;
}
