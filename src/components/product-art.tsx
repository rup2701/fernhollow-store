import { useId } from "react";
import type { ProductArt as Art } from "@/db/schema";

/**
 * Original, code-drawn product illustrations. They stand in for product
 * photography so the demo ships with no third-party imagery, and they
 * re-colour live when a shopper picks a glaze or yarn colour and preview
 * personalization (engraving, initials, cover name).
 */

export type ArtView = "hero" | "detail" | "lifestyle";

type Props = {
  art: Art;
  /** Overrides the object's main colour (from the selected swatch). */
  color?: string;
  personalization?: string | null;
  view?: ArtView;
  /** Accessible description. Pass "" for decorative use. */
  label: string;
  className?: string;
};

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const adjust = (c: number) => Math.round(Math.min(255, Math.max(0, amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  const r = adjust((n >> 16) & 255);
  const g = adjust((n >> 8) & 255);
  const b = adjust(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Deterministic pseudo-random points so speckles don't shift between renders. */
function speckles(count: number, seed: number, box: { x: number; y: number; w: number; h: number }) {
  const pts: { x: number; y: number; r: number }[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < count; i++) pts.push({ x: box.x + rand() * box.w, y: box.y + rand() * box.h, r: 0.8 + rand() * 1.8 });
  return pts;
}

const VIEWBOX: Record<ArtView, string> = {
  hero: "0 0 400 400",
  lifestyle: "0 0 400 400",
  detail: "95 105 210 210",
};

export function ProductArt({ art, color, personalization, view = "hero", label, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const c = color ?? art.primary;
  const a = art.accent;
  const text = personalization?.trim() || null;
  const decorative = label === "";

  return (
    <svg
      viewBox={VIEWBOX[view]}
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect x="0" y="0" width="400" height="400" fill={art.backdrop} />
      {view === "lifestyle" ? (
        <g>
          <rect x="0" y="300" width="400" height="100" fill={shade(art.backdrop, -0.07)} />
          <rect x="0" y="300" width="400" height="3" fill={shade(art.backdrop, -0.14)} />
          {/* a small sprig, because every table needs one */}
          <path d="M40 300 C44 270 52 250 66 236" stroke="#6f7a4a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="58" cy="256" rx="10" ry="5" transform="rotate(-50 58 256)" fill="#7f8b57" />
          <ellipse cx="48" cy="274" rx="10" ry="5" transform="rotate(-30 48 274)" fill="#6f7a4a" />
          <ellipse cx="68" cy="240" rx="9" ry="4.5" transform="rotate(-70 68 240)" fill="#8d9a63" />
        </g>
      ) : (
        <circle cx="200" cy="205" r="160" fill="#ffffff" opacity="0.28" />
      )}
      <g>{drawObject(art.kind, c, a, art.backdrop, text, uid)}</g>
    </svg>
  );
}

function Shadow({ cx = 200, cy = 312, rx = 100 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.11} fill="#000" opacity="0.1" />;
}

function drawObject(kind: Art["kind"], c: string, a: string, backdrop: string, text: string | null, uid: string) {
  switch (kind) {
    case "mug":
      return (
        <>
          <Shadow rx={92} />
          <path d="M266 175 C326 172 326 270 262 262" stroke={shade(c, -0.08)} strokeWidth="22" fill="none" strokeLinecap="round" />
          <path d="M130 140 L270 140 L264 288 Q262 310 238 310 L162 310 Q138 310 136 288 Z" fill={c} />
          <path d="M137 290 Q138 310 162 310 L238 310 Q262 310 263 290 Z" fill="#cbb89a" />
          {speckles(46, 7, { x: 140, y: 152, w: 120, h: 130 }).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={shade(c, -0.5)} opacity="0.55" />
          ))}
          <path d="M150 160 L146 280" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.18" />
          <ellipse cx="200" cy="140" rx="70" ry="12" fill={shade(c, 0.12)} />
          <ellipse cx="200" cy="142" rx="61" ry="8.5" fill="#4a3426" />
        </>
      );
    case "bowl":
      return (
        <>
          <Shadow cy={304} rx={130} />
          <path d="M60 190 Q66 300 200 302 Q334 300 340 190 Z" fill={c} />
          <path d="M168 300 L172 312 L228 312 L232 300 Z" fill="#cbb89a" />
          {speckles(60, 3, { x: 90, y: 205, w: 220, h: 80 }).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={shade(c, -0.5)} opacity="0.45" />
          ))}
          <ellipse cx="200" cy="190" rx="140" ry="28" fill={shade(c, 0.14)} />
          <ellipse cx="200" cy="192" rx="128" ry="22" fill={shade(c, -0.1)} />
          <path d="M92 215 Q110 270 160 285" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.2" />
        </>
      );
    case "candle":
      return (
        <>
          <Shadow rx={72} />
          <rect x="140" y="130" width="120" height="182" rx="18" fill={c} opacity="0.92" />
          <ellipse cx="200" cy="152" rx="52" ry="9" fill={a} />
          <rect x="148" y="152" width="104" height="150" rx="12" fill={a} opacity="0.22" />
          <line x1="200" y1="152" x2="200" y2="136" stroke="#2b2420" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M200 92 C212 110 212 126 200 134 C188 126 188 110 200 92 Z" fill="#efb04a" />
          <path d="M200 108 C206 118 206 126 200 130 C194 126 194 118 200 108 Z" fill="#fff4cf" />
          <rect x="156" y="196" width="88" height="64" rx="4" fill="#f7f0e3" />
          <text x="200" y="222" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" letterSpacing="1.2" fill="#2b2420">
            FERNHOLLOW
          </text>
          <line x1="176" y1="234" x2="224" y2="234" stroke="#2b2420" strokeWidth="1" opacity="0.5" />
          <text x="200" y="250" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fontStyle="italic" fill="#2b2420">
            hand-poured
          </text>
          <rect x="150" y="140" width="8" height="160" rx="4" fill="#fff" opacity="0.25" />
        </>
      );
    case "board":
      return (
        <>
          <Shadow cx={215} cy={318} rx={150} />
          <rect x="300" y="190" width="68" height="62" rx="18" fill={c} />
          <circle cx="344" cy="221" r="10" fill={backdrop} />
          <rect x="52" y="128" width="268" height="186" rx="18" fill={c} />
          {[150, 172, 196, 222, 248, 270].map((y, i) => (
            <path
              key={y}
              d={`M62 ${y} C120 ${y - 8 + (i % 2) * 14} 200 ${y + 10} 312 ${y - 4}`}
              stroke={shade(c, -0.28)}
              strokeWidth="1.6"
              fill="none"
              opacity="0.55"
            />
          ))}
          <rect x="52" y="128" width="268" height="186" rx="18" fill="none" stroke={shade(c, -0.25)} strokeWidth="2" />
          {text ? (
            <text
              x="186"
              y="296"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize={text.length > 16 ? 13 : 16}
              fontStyle="italic"
              fill={shade(c, -0.55)}
            >
              {text}
            </text>
          ) : null}
        </>
      );
    case "necklace":
      return (
        <>
          <path d="M96 40 Q110 250 200 262 Q290 250 304 40" stroke={c} strokeWidth="4" fill="none" strokeDasharray="1 6" strokeLinecap="round" />
          <rect x="194" y="258" width="12" height="16" rx="5" fill={shade(c, -0.15)} />
          <circle cx="200" cy="314" r="44" fill={c} />
          <circle cx="200" cy="314" r="38" fill="none" stroke={shade(c, -0.2)} strokeWidth="1.5" opacity="0.6" />
          <path d="M176 290 Q190 280 206 282" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.35" />
          <text
            x="200"
            y="324"
            textAnchor="middle"
            fontFamily="'Courier New', monospace"
            fontWeight="700"
            fontSize="26"
            letterSpacing="3"
            fill={shade(c, -0.55)}
          >
            {(text ?? "").toUpperCase()}
          </text>
        </>
      );
    case "blanket":
      return (
        <>
          <defs>
            <pattern id={`hb-${uid}`} width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M0 16 L8 0 M8 16 L16 0" stroke={a} strokeWidth="1.4" opacity="0.28" />
            </pattern>
          </defs>
          <Shadow cy={312} rx={140} />
          <rect x="72" y="214" width="256" height="92" rx="12" fill={shade(c, -0.08)} />
          <rect x="72" y="214" width="256" height="92" rx="12" fill={`url(#hb-${uid})`} />
          <rect x="84" y="150" width="232" height="76" rx="12" fill={c} />
          <rect x="84" y="150" width="232" height="76" rx="12" fill={`url(#hb-${uid})`} />
          <rect x="84" y="150" width="232" height="14" rx="7" fill="#fff" opacity="0.12" />
          {Array.from({ length: 30 }, (_, i) => (
            <line key={i} x1={80 + i * 8.3} y1="306" x2={78 + i * 8.3} y2="322" stroke={shade(c, -0.12)} strokeWidth="2.2" strokeLinecap="round" />
          ))}
        </>
      );
    case "towel":
      return (
        <>
          <line x1="80" y1="88" x2="320" y2="88" stroke="#8a6a4a" strokeWidth="7" strokeLinecap="round" />
          <rect x="146" y="98" width="160" height="226" rx="3" fill={shade(c, -0.07)} />
          <rect x="120" y="92" width="160" height="232" rx="3" fill={c} />
          <path d="M196 92 Q200 76 206 92" stroke={a} strokeWidth="3" fill="none" />
          {[120, 134, 282, 296].map((y, i) => (
            <rect key={y} x="120" y={y} width="160" height={i % 2 === 0 ? 9 : 3} fill={a} />
          ))}
          <line x1="124" y1="316" x2="276" y2="316" stroke={shade(c, -0.2)} strokeWidth="1" strokeDasharray="3 3" />
          <path d="M140 150 L140 270" stroke="#fff" strokeWidth="5" opacity="0.3" strokeLinecap="round" />
        </>
      );
    case "journal":
      return (
        <>
          <Shadow cy={318} rx={110} />
          <rect x="284" y="96" width="10" height="218" rx="2" fill={a} />
          <rect x="112" y="88" width="178" height="230" rx="10" fill={c} />
          <rect x="112" y="88" width="24" height="230" rx="8" fill={shade(c, -0.18)} />
          <line x1="142" y1="100" x2="142" y2="306" stroke={a} strokeWidth="1.6" strokeDasharray="5 5" opacity="0.8" />
          <path d="M290 200 C330 202 336 236 316 268" stroke={shade(c, -0.3)} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="290" cy="200" r="5" fill={shade(c, -0.3)} />
          {text ? (
            <text x="210" y="178" textAnchor="middle" fontFamily="Georgia, serif" fontSize={text.length > 14 ? 15 : 19} fill={shade(c, -0.38)}>
              {text}
            </text>
          ) : (
            <path d="M210 210 C210 180 196 162 182 150 M210 188 C220 176 232 170 240 168 M210 200 C198 194 190 192 182 194" stroke={shade(c, -0.32)} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          )}
        </>
      );
    case "hanger":
      return (
        <>
          <circle cx="200" cy="58" r="16" fill="none" stroke="#b08a5a" strokeWidth="7" />
          {[
            [196, 150, 152, 252],
            [198, 150, 184, 256],
            [202, 150, 216, 256],
            [204, 150, 248, 252],
          ].map(([x1, y1, x2, y2], i) => (
            <g key={i}>
              <path d={`M200 76 L${x1} ${y1}`} stroke={c} strokeWidth="3.5" />
              <path d={`M${x1} ${y1} Q${(x1 + x2) / 2 + (i < 2 ? -14 : 14)} ${(y1 + y2) / 2} ${x2} ${y2}`} stroke={c} strokeWidth="3.5" fill="none" />
            </g>
          ))}
          <circle cx="200" cy="150" r="9" fill={shade(c, -0.08)} />
          <circle cx="168" cy="204" r="6" fill={shade(c, -0.08)} />
          <circle cx="232" cy="204" r="6" fill={shade(c, -0.08)} />
          <ellipse cx="160" cy="236" rx="24" ry="9" transform="rotate(-30 160 236)" fill={a} />
          <ellipse cx="236" cy="232" rx="26" ry="9" transform="rotate(25 236 232)" fill={shade(a, -0.12)} />
          <ellipse cx="200" cy="226" rx="10" ry="24" fill={shade(a, 0.1)} />
          <path d="M142 250 L258 250 L246 320 Q244 328 236 328 L164 328 Q156 328 154 320 Z" fill="#b8693f" />
          <rect x="138" y="246" width="124" height="14" rx="4" fill="#a65c35" />
          <path d="M150 272 C126 290 128 318 140 336" stroke={a} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="136" cy="318" rx="9" ry="5" transform="rotate(60 136 318)" fill={a} />
        </>
      );
    case "vase":
      return (
        <>
          <Shadow cy={312} rx={56} />
          <path d="M202 176 C206 140 214 104 222 70" stroke={a} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="212" cy="120" rx="12" ry="5" transform="rotate(-40 212 120)" fill={a} />
          <ellipse cx="206" cy="146" rx="11" ry="4.5" transform="rotate(30 206 146)" fill={shade(a, 0.15)} />
          <circle cx="223" cy="64" r="11" fill="#e3a68c" />
          <circle cx="223" cy="64" r="4" fill="#c9784f" />
          <path
            d="M200 172 C186 172 186 184 190 198 C160 222 150 272 168 300 Q200 318 232 300 C250 272 240 222 210 198 C214 184 214 172 200 172 Z"
            fill={c}
            stroke={shade(c, -0.1)}
            strokeWidth="1.5"
          />
          <path d="M176 238 C170 258 172 280 182 294" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
        </>
      );
  }
}
