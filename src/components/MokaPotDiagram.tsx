import type { SimulationPoint } from '../physics'

interface Props {
  currentPoint: SimulationPoint | null
  potMaterial: 'aluminum' | 'stainless'
}

export default function MokaPotDiagram({ currentPoint, potMaterial }: Props) {
  const phase = currentPoint?.phase || 'heating'
  const temp = currentPoint?.waterTemp || 20
  const pressure = currentPoint?.pressure || 0
  const extraction = currentPoint?.extractionPct || 0

  const waterLevel = Math.max(0, 100 - extraction)
  const coffeeLevel = extraction

  // Water color based on temperature
  const waterHue = Math.max(0, 200 - (temp / 100) * 200)
  const waterColor = `hsl(${waterHue}, 70%, 50%)`

  const showBubbles = temp > 85
  const showSteam = phase === 'brewing' || temp > 95

  // Material colors
  const potBody = potMaterial === 'aluminum' ? '#b8b8b8' : '#707070'
  const potLight = potMaterial === 'aluminum' ? '#d4d4d4' : '#909090'
  const potDark = potMaterial === 'aluminum' ? '#8a8a8a' : '#505050'
  const potShine = potMaterial === 'aluminum' ? '#e8e8e8' : '#a0a0a0'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 380" className="w-48 sm:w-56 md:w-64 drop-shadow-2xl">
        <defs>
          {/* Metallic gradient for pot body */}
          <linearGradient id="potGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={potDark} />
            <stop offset="25%" stopColor={potLight} />
            <stop offset="45%" stopColor={potShine} />
            <stop offset="60%" stopColor={potLight} />
            <stop offset="100%" stopColor={potDark} />
          </linearGradient>
          <linearGradient id="potGradientDark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={potDark} />
            <stop offset="30%" stopColor={potBody} />
            <stop offset="50%" stopColor={potLight} />
            <stop offset="70%" stopColor={potBody} />
            <stop offset="100%" stopColor={potDark} />
          </linearGradient>
          {/* Lid knob gradient */}
          <radialGradient id="knobGradient" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#333" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          {/* Handle gradient */}
          <linearGradient id="handleGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="50%" stopColor="#333" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
        </defs>

        {/* ====== STEAM ====== */}
        {showSteam && (
          <g opacity="0.6">
            {[0, 1, 2, 3, 4].map(i => (
              <g key={i}>
                <path
                  d={`M ${105 + i * 8} 42 Q ${100 + i * 8} ${25 - i * 3} ${108 + i * 8} ${10 - i * 2}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="opacity"
                    values="0.3;0.05;0.3"
                    dur={`${1.5 + i * 0.4}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="d"
                    values={`M ${105 + i * 8} 42 Q ${100 + i * 8} ${25 - i * 3} ${108 + i * 8} ${10 - i * 2};M ${105 + i * 8} 42 Q ${112 + i * 8} ${20 - i * 3} ${103 + i * 8} ${5 - i * 2};M ${105 + i * 8} 42 Q ${100 + i * 8} ${25 - i * 3} ${108 + i * 8} ${10 - i * 2}`}
                    dur={`${2 + i * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            ))}
          </g>
        )}

        {/* ====== LID KNOB (black bakelite) ====== */}
        <ellipse cx="120" cy="44" rx="12" ry="5" fill="url(#knobGradient)" />
        <rect x="112" y="44" width="16" height="6" rx="2" fill="url(#knobGradient)" />
        <ellipse cx="120" cy="43" rx="10" ry="4" fill="#222" />
        <ellipse cx="118" cy="42" rx="4" ry="2" fill="#444" opacity="0.4" />

        {/* ====== LID ====== */}
        <ellipse cx="120" cy="52" rx="38" ry="8" fill="url(#potGradient)" />
        <path
          d="M 82 52 Q 82 56 120 58 Q 158 56 158 52"
          fill={potDark}
          opacity="0.3"
        />

        {/* ====== UPPER CHAMBER (octagonal/faceted look) ====== */}
        <path
          d="M 82 52 L 78 65 L 75 130 L 165 130 L 162 65 L 158 52"
          fill="url(#potGradient)"
          stroke={potDark}
          strokeWidth="0.5"
        />
        {/* Facet lines to suggest octagonal shape */}
        <line x1="90" y1="54" x2="87" y2="130" stroke={potShine} strokeWidth="0.5" opacity="0.4" />
        <line x1="150" y1="54" x2="153" y2="130" stroke={potDark} strokeWidth="0.5" opacity="0.4" />
        <line x1="105" y1="52" x2="102" y2="130" stroke={potShine} strokeWidth="0.3" opacity="0.2" />
        <line x1="135" y1="52" x2="138" y2="130" stroke={potDark} strokeWidth="0.3" opacity="0.2" />

        {/* Shine highlight on upper body */}
        <path
          d="M 92 55 L 90 125 L 105 125 L 107 55"
          fill={potShine}
          opacity="0.15"
        />

        {/* Coffee filling upper chamber */}
        {coffeeLevel > 0 && (
          <>
            <clipPath id="upperChamber">
              <path d="M 78 56 L 75 130 L 165 130 L 162 56 Z" />
            </clipPath>
            <rect
              x="75"
              y={130 - (coffeeLevel / 100) * 70}
              width="90"
              height={(coffeeLevel / 100) * 70}
              fill="#3d1a00"
              clipPath="url(#upperChamber)"
              opacity="0.8"
            >
              <animate
                attributeName="opacity"
                values="0.7;0.85;0.7"
                dur="2s"
                repeatCount="indefinite"
              />
            </rect>
            {/* Coffee surface shine */}
            <line
              x1="80"
              y1={130 - (coffeeLevel / 100) * 70}
              x2="160"
              y2={130 - (coffeeLevel / 100) * 70}
              stroke="#5c2a00"
              strokeWidth="1.5"
              clipPath="url(#upperChamber)"
              opacity="0.6"
            />
          </>
        )}

        {/* ====== SPOUT ====== */}
        <path
          d="M 162 72 C 178 72 182 78 182 88 C 182 98 178 102 170 100"
          fill="none"
          stroke="url(#potGradient)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 162 72 C 176 72 180 77 180 87 C 180 96 176 99 170 98"
          fill="none"
          stroke={potShine}
          strokeWidth="1"
          opacity="0.3"
        />
        {/* Spout opening */}
        <ellipse cx="171" cy="99" rx="4" ry="2.5" fill={potDark} />

        {/* ====== HANDLE (black bakelite, curved) ====== */}
        <path
          d="M 78 60 C 45 62 40 95 42 120 C 44 145 50 148 75 135"
          fill="none"
          stroke="url(#handleGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Handle inner highlight */}
        <path
          d="M 78 60 C 50 62 46 95 48 118 C 50 140 54 143 75 133"
          fill="none"
          stroke="#444"
          strokeWidth="2"
          opacity="0.3"
          strokeLinecap="round"
        />

        {/* ====== WAIST / JOINT BAND ====== */}
        <rect x="72" y="128" width="96" height="10" rx="1" fill={potBody} stroke={potDark} strokeWidth="0.5" />
        <rect x="72" y="129" width="96" height="3" fill={potShine} opacity="0.3" />
        {/* Safety valve bump */}
        <circle cx="165" cy="133" r="4" fill={potBody} stroke={potDark} strokeWidth="0.5" />
        <circle cx="165" cy="132" r="2" fill={potShine} opacity="0.3" />

        {/* ====== FILTER BASKET (inside, visible through cross-section feel) ====== */}
        <path
          d="M 78 138 L 76 168 L 164 168 L 162 138"
          fill="#6b4423"
          stroke={potDark}
          strokeWidth="0.5"
          opacity="0.9"
        />
        {/* Grounds texture */}
        <pattern id="groundsPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#8B5E3C" opacity="0.6" />
          <circle cx="6" cy="6" r="1" fill="#4a2c0a" opacity="0.4" />
          <circle cx="5" cy="2" r="0.8" fill="#7a4a28" opacity="0.5" />
        </pattern>
        <rect x="78" y="140" width="84" height="26" fill="url(#groundsPattern)" opacity="0.7" />
        {/* Perforated plate line */}
        <line x1="76" y1="168" x2="164" y2="168" stroke={potDark} strokeWidth="1.5" strokeDasharray="2,2" />

        {/* ====== LOWER CHAMBER (boiler) ====== */}
        <path
          d="M 76 168 L 68 280 Q 68 310 120 310 Q 172 310 172 280 L 164 168"
          fill="url(#potGradientDark)"
          stroke={potDark}
          strokeWidth="0.5"
        />
        {/* Facet lines on lower body */}
        <line x1="85" y1="170" x2="78" y2="300" stroke={potShine} strokeWidth="0.5" opacity="0.3" />
        <line x1="155" y1="170" x2="162" y2="300" stroke={potDark} strokeWidth="0.5" opacity="0.3" />
        {/* Shine on lower body */}
        <path
          d="M 87 172 L 80 295 Q 82 305 95 307 L 100 172"
          fill={potShine}
          opacity="0.1"
        />

        {/* Water in lower chamber */}
        <clipPath id="lowerChamber">
          <path d="M 70 172 L 68 280 Q 68 310 120 310 Q 172 310 172 280 L 170 172 Z" />
        </clipPath>
        <rect
          x="68"
          y={310 - (waterLevel / 100) * 130}
          width="104"
          height={(waterLevel / 100) * 130}
          fill={waterColor}
          clipPath="url(#lowerChamber)"
          opacity="0.6"
        />

        {/* Bubbles */}
        {showBubbles && (
          <g clipPath="url(#lowerChamber)">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <circle
                key={i}
                cx={90 + i * 14}
                cy={290}
                r={1.5 + (i % 3)}
                fill="rgba(255,255,255,0.35)"
              >
                <animate
                  attributeName="cy"
                  values={`${290};${220};${290}`}
                  dur={`${1.2 + i * 0.25}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0;0.4"
                  dur={`${1.2 + i * 0.25}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

        {/* ====== STOVE GRATE ====== */}
        <rect x="45" y="315" width="150" height="4" rx="2" fill="#555" />
        {/* Grate bars */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={55 + i * 19} y="313" width="3" height="6" rx="1" fill="#666" />
        ))}

        {/* Flames */}
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <g key={i}>
              {/* Outer flame (orange) */}
              <path
                d={`M ${62 + i * 17} 340 Q ${65 + i * 17} ${phase !== 'done' ? 322 : 335} ${68 + i * 17} 340`}
                fill={phase !== 'done' ? '#ff6b20' : '#444'}
                opacity={phase !== 'done' ? 0.7 : 0.2}
              >
                {phase !== 'done' && (
                  <animate
                    attributeName="d"
                    values={`M ${62 + i * 17} 340 Q ${65 + i * 17} 322 ${68 + i * 17} 340;M ${62 + i * 17} 340 Q ${65 + i * 17} 318 ${68 + i * 17} 340;M ${62 + i * 17} 340 Q ${65 + i * 17} 322 ${68 + i * 17} 340`}
                    dur={`${0.4 + i * 0.08}s`}
                    repeatCount="indefinite"
                  />
                )}
              </path>
              {/* Inner flame (blue) */}
              {phase !== 'done' && (
                <path
                  d={`M ${63.5 + i * 17} 340 Q ${65 + i * 17} 328 ${66.5 + i * 17} 340`}
                  fill="#4488ff"
                  opacity="0.5"
                >
                  <animate
                    attributeName="d"
                    values={`M ${63.5 + i * 17} 340 Q ${65 + i * 17} 328 ${66.5 + i * 17} 340;M ${63.5 + i * 17} 340 Q ${65 + i * 17} 325 ${66.5 + i * 17} 340;M ${63.5 + i * 17} 340 Q ${65 + i * 17} 328 ${66.5 + i * 17} 340`}
                    dur={`${0.35 + i * 0.07}s`}
                    repeatCount="indefinite"
                  />
                </path>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* Status indicators */}
      <div className="mt-4 flex gap-4 text-xs sm:text-sm">
        <div className="text-center">
          <div className="text-coffee-400 font-medium">Temp</div>
          <div className="text-coffee-100 font-bold text-base">{temp.toFixed(1)}°C</div>
        </div>
        <div className="text-center">
          <div className="text-coffee-400 font-medium">Pressure</div>
          <div className="text-coffee-100 font-bold text-base">{pressure.toFixed(2)} bar</div>
        </div>
        <div className="text-center">
          <div className="text-coffee-400 font-medium">Phase</div>
          <div className={`font-bold text-base capitalize ${
            phase === 'heating' ? 'text-amber-400' :
            phase === 'brewing' ? 'text-brew-400' :
            'text-coffee-300'
          }`}>
            {phase}
          </div>
        </div>
      </div>
    </div>
  )
}
