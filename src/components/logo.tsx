/** Original mark: a fern frond inside a kiln-arch. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M6 36V18C6 10.3 12.3 4 20 4s14 6.3 14 14v18Z" fill="#a2471f" />
      <path d="M20 33V12" stroke="#f7f2ea" strokeWidth="2" strokeLinecap="round" />
      {[14, 18, 22, 26].map((y, i) => (
        <g key={y} stroke="#f7f2ea" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d={`M20 ${y + 2} Q${15 - i * 0.6} ${y + 1} ${13 - i} ${y - 2}`} />
          <path d={`M20 ${y + 2} Q${25 + i * 0.6} ${y + 1} ${27 + i} ${y - 2}`} />
        </g>
      ))}
    </svg>
  );
}
