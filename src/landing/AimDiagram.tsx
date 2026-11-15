/** A line drawing of "where you look": the horizon, the compass points and a line of sight. */
export default function AimDiagram() {
  const ink = '#ece6d6'
  const faint = '#8b8473'
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Diagram: a line of sight rising from the horizon towards the north-east" className="block w-full">
      {/* the dome of the sky */}
      <path d="M30 160A130 130 0 0 1 290 160" fill="none" stroke={faint} strokeDasharray="2 5" />
      {/* horizon */}
      <line x1="14" x2="306" y1="160" y2="160" stroke={ink} />
      {[
        ['W', 30],
        ['N', 160],
        ['E', 290],
      ].map(([l, cx]) => (
        <g key={l}>
          <line x1={cx} x2={cx} y1={160} y2={166} stroke={ink} />
          <text x={cx} y={182} textAnchor="middle" fontSize={11} letterSpacing={1} fill={faint} fontFamily="IBM Plex Sans, sans-serif">
            {l}
          </text>
        </g>
      ))}
      {/* line of sight */}
      <line x1="160" y1="160" x2="238" y2="62" stroke={ink} strokeWidth={1.4} />
      <path d="M238 62l-12 4M238 62l-2 12.5" fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" />
      <circle cx="160" cy="160" r="3" fill={ink} />
      {/* height above the horizon */}
      <path d="M204 160A44 44 0 0 0 187.5 125.6" fill="none" stroke="#74c3b1" strokeWidth={1.4} />
      <text x="212" y="146" fontSize={11} fill="#74c3b1" fontFamily="IBM Plex Mono, monospace">
        height
      </text>
      <text x="246" y="56" fontSize={12} fontStyle="italic" fill={ink} fontFamily="Spectral, Georgia, serif">
        that sky
      </text>
    </svg>
  )
}
