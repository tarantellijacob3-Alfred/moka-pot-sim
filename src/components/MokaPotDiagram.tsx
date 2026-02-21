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

  // Water level decreases as extraction progresses
  const waterLevel = Math.max(0, 100 - extraction)
  // Coffee level in upper chamber increases
  const coffeeLevel = extraction

  // Color based on temperature
  const waterHue = Math.max(0, 200 - (temp / 100) * 200) // blue → red
  const waterColor = `hsl(${waterHue}, 70%, 50%)`

  // Steam bubbles visible when near boiling
  const showBubbles = temp > 85
  const showSteam = phase === 'brewing' || (temp > 95)

  const potColor = potMaterial === 'aluminum' ? '#c0c0c0' : '#808080'
  const potHighlight = potMaterial === 'aluminum' ? '#d8d8d8' : '#999'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 320" className="w-48 sm:w-56 md:w-64 drop-shadow-2xl">
        {/* Steam coming out of top */}
        {showSteam && (
          <g className="animate-pulse">
            {[0, 1, 2].map(i => (
              <g key={i}>
                <circle
                  cx={85 + i * 15}
                  cy={25 - i * 8}
                  r={4 + i}
                  fill="rgba(255,255,255,0.15)"
                >
                  <animate
                    attributeName="cy"
                    values={`${25 - i * 8};${5 - i * 8};${25 - i * 8}`}
                    dur={`${2 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;0.05;0.3"
                    dur={`${2 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            ))}
          </g>
        )}

        {/* === UPPER CHAMBER (collector) === */}
        {/* Lid / top */}
        <ellipse cx="100" cy="45" rx="30" ry="6" fill={potHighlight} stroke={potColor} strokeWidth="1.5" />

        {/* Upper body */}
        <path
          d={`M 70 45 L 65 130 L 135 130 L 130 45`}
          fill={potColor}
          stroke={potHighlight}
          strokeWidth="1"
          opacity="0.9"
        />

        {/* Coffee filling upper chamber */}
        {coffeeLevel > 0 && (
          <clipPath id="upperChamber">
            <path d={`M 68 50 L 65 130 L 135 130 L 132 50 Z`} />
          </clipPath>
        )}
        {coffeeLevel > 0 && (
          <rect
            x="65"
            y={130 - (coffeeLevel / 100) * 75}
            width="70"
            height={(coffeeLevel / 100) * 75}
            fill="#3d1a00"
            clipPath="url(#upperChamber)"
            opacity="0.85"
          >
            <animate
              attributeName="opacity"
              values="0.75;0.9;0.75"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Spout */}
        <path
          d="M 130 70 Q 155 75 150 95 Q 147 105 140 100"
          fill="none"
          stroke={potColor}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Handle */}
        <path
          d="M 70 55 Q 40 60 38 90 Q 36 120 65 125"
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* === MIDDLE SECTION (filter/grounds) === */}
        <rect x="62" y="130" width="76" height="8" rx="2" fill={potHighlight} stroke={potColor} strokeWidth="1" />

        {/* Filter basket with grounds */}
        <path
          d="M 68 138 L 66 170 L 134 170 L 132 138"
          fill="#5c3c18"
          stroke={potColor}
          strokeWidth="1"
        />
        {/* Grounds texture dots */}
        {phase === 'brewing' && (
          <g opacity="0.6">
            {Array.from({ length: 8 }).map((_, i) => (
              <circle
                key={i}
                cx={80 + (i % 4) * 15}
                cy={148 + Math.floor(i / 4) * 12}
                r="2"
                fill="#8B4513"
              >
                <animate
                  attributeName="r"
                  values="2;3;2"
                  dur={`${1 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

        {/* === LOWER CHAMBER (boiler) === */}
        <path
          d="M 66 170 L 60 260 Q 60 280 100 280 Q 140 280 140 260 L 134 170"
          fill={potColor}
          stroke={potHighlight}
          strokeWidth="1"
          opacity="0.9"
        />

        {/* Water in lower chamber */}
        <clipPath id="lowerChamber">
          <path d="M 62 175 L 60 260 Q 60 280 100 280 Q 140 280 140 260 L 138 175 Z" />
        </clipPath>
        <rect
          x="60"
          y={280 - (waterLevel / 100) * 100}
          width="80"
          height={(waterLevel / 100) * 100}
          fill={waterColor}
          clipPath="url(#lowerChamber)"
          opacity="0.7"
        />

        {/* Bubbles in water when heating */}
        {showBubbles && (
          <g clipPath="url(#lowerChamber)">
            {[0, 1, 2, 3, 4].map(i => (
              <circle
                key={i}
                cx={80 + i * 12}
                cy={260}
                r={2 + Math.random() * 2}
                fill="rgba(255,255,255,0.4)"
              >
                <animate
                  attributeName="cy"
                  values={`${260};${200};${260}`}
                  dur={`${1.5 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0;0.5"
                  dur={`${1.5 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

        {/* === STOVE / HEAT SOURCE === */}
        <rect x="40" y="285" width="120" height="6" rx="3" fill="#444" />
        {/* Flame / heat indicators */}
        <g>
          {[0, 1, 2, 3, 4].map(i => (
            <path
              key={i}
              d={`M ${60 + i * 18} 310 Q ${63 + i * 18} 295 ${66 + i * 18} 310`}
              fill={phase !== 'done' ? '#ff6b35' : '#555'}
              opacity={phase !== 'done' ? 0.8 : 0.3}
            >
              {phase !== 'done' && (
                <animate
                  attributeName="d"
                  values={`M ${60 + i * 18} 310 Q ${63 + i * 18} 295 ${66 + i * 18} 310;M ${60 + i * 18} 310 Q ${63 + i * 18} 290 ${66 + i * 18} 310;M ${60 + i * 18} 310 Q ${63 + i * 18} 295 ${66 + i * 18} 310`}
                  dur={`${0.5 + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              )}
            </path>
          ))}
        </g>

        {/* Labels */}
        <text x="155" y="90" fill="#d4a564" fontSize="9" fontWeight="600" opacity="0.8">
          ☕ {coffeeLevel.toFixed(0)}%
        </text>
        <text x="155" y="155" fill="#d4a564" fontSize="9" fontWeight="600" opacity="0.8">
          ⬡ grounds
        </text>
        <text x="155" y="230" fill="#d4a564" fontSize="9" fontWeight="600" opacity="0.8">
          💧 {waterLevel.toFixed(0)}%
        </text>
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
