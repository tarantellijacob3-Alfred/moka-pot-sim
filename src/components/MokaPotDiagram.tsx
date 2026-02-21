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

  const waterHue = Math.max(0, 200 - (temp / 100) * 200)
  const waterColor = `hsl(${waterHue}, 70%, 50%)`

  const showBubbles = temp > 85
  const showSteam = phase === 'brewing' || temp > 95
  const isHot = temp > 70

  // 3D material colors — richer gradients
  const isAlu = potMaterial === 'aluminum'
  const bodyMain = isAlu ? '#c8c8c8' : '#6a6a6a'
  const bodyLight = isAlu ? '#e8e8e8' : '#999'
  const bodyDark = isAlu ? '#7a7a7a' : '#3a3a3a'
  const bodyShine = isAlu ? '#f4f4f4' : '#b0b0b0'
  const bodyShadow = isAlu ? '#555' : '#222'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 260 400" className="w-52 sm:w-60 md:w-72" style={{ filter: isHot ? 'drop-shadow(0 0 20px rgba(255,140,50,0.15))' : 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}>
        <defs>
          {/* 3D body gradient — cylindrical highlight */}
          <linearGradient id="body3d" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={bodyShadow} />
            <stop offset="15%" stopColor={bodyDark} />
            <stop offset="35%" stopColor={bodyMain} />
            <stop offset="48%" stopColor={bodyShine} />
            <stop offset="55%" stopColor={bodyLight} />
            <stop offset="70%" stopColor={bodyMain} />
            <stop offset="90%" stopColor={bodyDark} />
            <stop offset="100%" stopColor={bodyShadow} />
          </linearGradient>
          {/* Darker version for lower chamber */}
          <linearGradient id="body3dLower" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={bodyShadow} />
            <stop offset="18%" stopColor={bodyDark} />
            <stop offset="40%" stopColor={bodyMain} />
            <stop offset="50%" stopColor={bodyLight} />
            <stop offset="62%" stopColor={bodyMain} />
            <stop offset="85%" stopColor={bodyDark} />
            <stop offset="100%" stopColor={bodyShadow} />
          </linearGradient>
          {/* Rim/band gradient — polished metal ring */}
          <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bodyShine} />
            <stop offset="30%" stopColor={bodyMain} />
            <stop offset="50%" stopColor={bodyDark} />
            <stop offset="70%" stopColor={bodyMain} />
            <stop offset="100%" stopColor={bodyShine} />
          </linearGradient>
          {/* Lid top ellipse — 3D curve */}
          <radialGradient id="lidTop" cx="45%" cy="40%">
            <stop offset="0%" stopColor={bodyShine} />
            <stop offset="60%" stopColor={bodyMain} />
            <stop offset="100%" stopColor={bodyDark} />
          </radialGradient>
          {/* Knob */}
          <radialGradient id="knob3d" cx="38%" cy="30%">
            <stop offset="0%" stopColor="#555" />
            <stop offset="50%" stopColor="#222" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
          {/* Handle */}
          <linearGradient id="handle3d" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0a0a0a" />
            <stop offset="30%" stopColor="#333" />
            <stop offset="50%" stopColor="#444" />
            <stop offset="70%" stopColor="#333" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          {/* Hot glow */}
          <radialGradient id="hotGlow" cx="50%" cy="80%">
            <stop offset="0%" stopColor="rgba(255,120,40,0.15)" />
            <stop offset="100%" stopColor="rgba(255,120,40,0)" />
          </radialGradient>
          {/* Water gradient */}
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={waterColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={waterColor} stopOpacity="0.5" />
          </linearGradient>
          {/* Coffee gradient */}
          <linearGradient id="coffeeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c2a00" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3d1a00" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* ====== HOT GLOW ====== */}
        {isHot && <ellipse cx="130" cy="300" rx="100" ry="80" fill="url(#hotGlow)" />}

        {/* ====== STEAM ====== */}
        {showSteam && (
          <g>
            {[0, 1, 2, 3].map(i => (
              <path
                key={i}
                d={`M ${115 + i * 10} 48 C ${110 + i * 10} 30, ${120 + i * 10} 15, ${113 + i * 10} 0`}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={2.5 + i * 0.5}
                strokeLinecap="round"
              >
                <animate
                  attributeName="d"
                  values={`M ${115 + i * 10} 48 C ${110 + i * 10} 30, ${120 + i * 10} 15, ${113 + i * 10} 0;M ${115 + i * 10} 48 C ${122 + i * 10} 28, ${108 + i * 10} 12, ${118 + i * 10} -5;M ${115 + i * 10} 48 C ${110 + i * 10} 30, ${120 + i * 10} 15, ${113 + i * 10} 0`}
                  dur={`${2.2 + i * 0.5}s`}
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.15;0.03;0.15" dur={`${2.2 + i * 0.5}s`} repeatCount="indefinite" />
              </path>
            ))}
          </g>
        )}

        {/* ====== KNOB (bakelite) ====== */}
        <ellipse cx="130" cy="52" rx="14" ry="6" fill="url(#knob3d)" />
        <ellipse cx="130" cy="50" rx="12" ry="5" fill="#1a1a1a" />
        <ellipse cx="127" cy="49" rx="5" ry="2.5" fill="#333" opacity="0.5" />

        {/* ====== LID ====== */}
        <ellipse cx="130" cy="60" rx="42" ry="10" fill="url(#lidTop)" stroke={bodyDark} strokeWidth="0.5" />
        {/* Lid rim shadow */}
        <ellipse cx="130" cy="62" rx="42" ry="9" fill="none" stroke={bodyShadow} strokeWidth="0.5" opacity="0.4" />

        {/* ====== UPPER CHAMBER ====== */}
        <path
          d="M 88 60 L 83 75 L 80 140 L 180 140 L 177 75 L 172 60"
          fill="url(#body3d)"
          stroke={bodyDark}
          strokeWidth="0.3"
        />
        {/* 3D highlight strip */}
        <path d="M 100 62 L 97 138 L 110 138 L 113 62" fill={bodyShine} opacity="0.12" />
        {/* Shadow strip right */}
        <path d="M 160 62 L 163 138 L 172 138 L 169 62" fill={bodyShadow} opacity="0.15" />

        {/* Coffee in upper chamber */}
        {coffeeLevel > 0 && (
          <>
            <clipPath id="upperClip">
              <path d="M 82 64 L 80 140 L 180 140 L 178 64 Z" />
            </clipPath>
            <rect
              x="80" y={140 - (coffeeLevel / 100) * 72}
              width="100" height={(coffeeLevel / 100) * 72}
              fill="url(#coffeeGrad)"
              clipPath="url(#upperClip)"
            >
              <animate attributeName="opacity" values="0.75;0.9;0.75" dur="2.5s" repeatCount="indefinite" />
            </rect>
          </>
        )}

        {/* ====== SPOUT ====== */}
        <path
          d="M 177 80 C 196 80 200 88 200 100 C 200 112 195 116 185 113"
          fill="none"
          stroke="url(#body3d)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Spout highlight */}
        <path
          d="M 178 81 C 194 81 197 88 197 99 C 197 109 193 112 185 110"
          fill="none"
          stroke={bodyShine}
          strokeWidth="1.5"
          opacity="0.25"
        />

        {/* ====== HANDLE (bakelite, 3D) ====== */}
        <path
          d="M 88 68 C 50 70 44 105 46 135 C 48 160 56 164 82 148"
          fill="none"
          stroke="url(#handle3d)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Handle inner shine */}
        <path
          d="M 86 70 C 56 72 50 104 52 132 C 54 155 60 158 80 145"
          fill="none"
          stroke="#555"
          strokeWidth="1.5"
          opacity="0.25"
          strokeLinecap="round"
        />

        {/* ====== WAIST BAND ====== */}
        <rect x="77" y="138" width="106" height="12" rx="1" fill="url(#rimGrad)" stroke={bodyDark} strokeWidth="0.3" />
        {/* Band shine */}
        <rect x="77" y="139" width="106" height="4" rx="1" fill={bodyShine} opacity="0.2" />
        {/* Safety valve */}
        <circle cx="180" cy="144" r="5" fill="url(#body3d)" stroke={bodyDark} strokeWidth="0.5" />
        <circle cx="179" cy="143" r="2.5" fill={bodyShine} opacity="0.2" />

        {/* ====== FILTER BASKET (grounds) ====== */}
        <path
          d="M 83 150 L 81 180 L 179 180 L 177 150"
          fill="#6b4423"
          stroke={bodyDark}
          strokeWidth="0.5"
        />
        {/* Grounds texture */}
        {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
          <circle key={i} cx={92 + (i % 6) * 15} cy={157 + Math.floor(i / 6) * 12} r={2 + (i % 3) * 0.5}
            fill={i % 2 === 0 ? '#8B5E3C' : '#4a2c0a'} opacity="0.5" />
        ))}
        {/* Perforated plate */}
        <line x1="81" y1="180" x2="179" y2="180" stroke={bodyDark} strokeWidth="2" strokeDasharray="3,2" />

        {/* ====== LOWER CHAMBER ====== */}
        <path
          d="M 81 180 L 72 300 Q 72 330 130 330 Q 188 330 188 300 L 179 180"
          fill="url(#body3dLower)"
          stroke={bodyDark}
          strokeWidth="0.3"
        />
        {/* 3D highlight strip on lower body */}
        <path d="M 95 182 L 88 315 Q 90 325 105 327 L 110 182" fill={bodyShine} opacity="0.08" />
        {/* Shadow on right of lower body */}
        <path d="M 165 182 L 172 315 Q 175 325 180 315 L 175 182" fill={bodyShadow} opacity="0.1" />
        {/* Bottom ellipse to show 3D roundness */}
        <ellipse cx="130" cy="325" rx="55" ry="10" fill={bodyShadow} opacity="0.2" />

        {/* Water */}
        <clipPath id="lowerClip">
          <path d="M 74 184 L 72 300 Q 72 330 130 330 Q 188 330 188 300 L 186 184 Z" />
        </clipPath>
        <rect
          x="72" y={330 - (waterLevel / 100) * 140}
          width="116" height={(waterLevel / 100) * 140}
          fill="url(#waterGrad)"
          clipPath="url(#lowerClip)"
        />

        {/* Bubbles */}
        {showBubbles && (
          <g clipPath="url(#lowerClip)">
            {[0,1,2,3,4,5,6].map(i => (
              <circle key={i} cx={95 + i * 12} cy={310} r={1.5 + (i % 3)}
                fill="rgba(255,255,255,0.3)">
                <animate attributeName="cy" values={`${310};${230};${310}`} dur={`${1 + i * 0.2}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur={`${1 + i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}

        {/* ====== STOVE ====== */}
        <rect x="50" y="335" width="160" height="5" rx="2.5" fill="#555" />
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x={60 + i * 18} y="333" width="4" height="7" rx="1.5" fill="#666" />
        ))}

        {/* Flames */}
        {phase !== 'done' && (
          <g>
            {[0,1,2,3,4,5,6,7].map(i => (
              <g key={i}>
                <path
                  d={`M ${65 + i * 16} 360 Q ${67.5 + i * 16} 342 ${70 + i * 16} 360`}
                  fill="#ff6b20" opacity="0.65"
                >
                  <animate
                    attributeName="d"
                    values={`M ${65 + i * 16} 360 Q ${67.5 + i * 16} 342 ${70 + i * 16} 360;M ${65 + i * 16} 360 Q ${67.5 + i * 16} 338 ${70 + i * 16} 360;M ${65 + i * 16} 360 Q ${67.5 + i * 16} 342 ${70 + i * 16} 360`}
                    dur={`${0.35 + i * 0.06}s`} repeatCount="indefinite"
                  />
                </path>
                <path
                  d={`M ${66.5 + i * 16} 360 Q ${67.5 + i * 16} 348 ${68.5 + i * 16} 360`}
                  fill="#4488ff" opacity="0.45"
                >
                  <animate
                    attributeName="d"
                    values={`M ${66.5 + i * 16} 360 Q ${67.5 + i * 16} 348 ${68.5 + i * 16} 360;M ${66.5 + i * 16} 360 Q ${67.5 + i * 16} 345 ${68.5 + i * 16} 360;M ${66.5 + i * 16} 360 Q ${67.5 + i * 16} 348 ${68.5 + i * 16} 360`}
                    dur={`${0.3 + i * 0.05}s`} repeatCount="indefinite"
                  />
                </path>
              </g>
            ))}
          </g>
        )}
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
