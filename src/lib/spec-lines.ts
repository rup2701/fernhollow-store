/** Owner-typed bullet lists (Materials & care, Specifications) and the one kind of link allowed in them. */

export const LIST_LIMITS = { lines: 20, lineLength: 300, maker: 120 };

/** One item per line; surrounding spaces and blank lines are dropped. */
export function linesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export type LinePart = { text: string; href?: string };

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function safeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/**
 * Splits a line into plain text and http(s) links written as [text](url).
 * Anything else, including links with other schemes, stays as the plain text the owner typed.
 */
export function parseSpecLine(line: string): LinePart[] {
  const parts: LinePart[] = [];
  let last = 0;
  let plain = "";
  for (const m of line.matchAll(LINK)) {
    const href = safeHref(m[2]);
    if (!href) continue; // stays in the plain text
    plain += line.slice(last, m.index);
    if (plain) parts.push({ text: plain });
    plain = "";
    parts.push({ text: m[1], href });
    last = m.index + m[0].length;
  }
  plain += line.slice(last);
  if (plain) parts.push({ text: plain });
  return parts;
}
