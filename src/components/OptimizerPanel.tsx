import { useState, useMemo } from 'react'
import { simulate, getBrewQuality, getBrewTime, getPeakPressure, STOVE_PRESETS, ALTITUDE_PRESETS } from '../physics'
import type { MokaParams, BrewQuality } from '../physics'

interface Props {
  currentParams: MokaParams
  onApply: (params: MokaParams) => void
}

interface OptimizationResult {
  power: number
  quality: BrewQuality
  brewTime: number
  peakPressure: number
  avgFlow: number
}

const GRIND_LABELS = ['', 'Extra Fine', 'Very Fine', 'Fine', 'Med-Fine', 'Medium', 'Med-Coarse', 'Coarse', 'V. Coarse', 'X. Coarse', 'Turkish Coarse']

export default function OptimizerPanel({ currentParams, onApply }: Props) {
  const [stoveType, setStoveType] = useState(currentParams.stoveType)
  const [potSize, setPotSize] = useState(currentParams.potSize)
  const [potMaterial, setPotMaterial] = useState(currentParams.potMaterial)
  const [grindSize, setGrindSize] = useState(currentParams.grindSize)
  const [altitude, setAltitude] = useState(currentParams.altitude)
  const [startingWaterTemp, setStartingWaterTemp] = useState(currentParams.startingWaterTemp)

  // Sweep stove power to find optimal
  const results = useMemo(() => {
    const range = stoveType === 'gas'
      ? { min: 300, max: 5000, step: 50 }
      : stoveType === 'electric'
      ? { min: 200, max: 3000, step: 50 }
      : { min: 100, max: 2500, step: 50 }

    const all: OptimizationResult[] = []
    for (let power = range.min; power <= range.max; power += range.step) {
      const params: MokaParams = { stoveType, stovePower: power, grindSize, potMaterial, potSize, altitude, startingWaterTemp }
      const data = simulate(params)
      const quality = getBrewQuality(data, params)
      const brewTime = getBrewTime(data)
      const peakPressure = getPeakPressure(data)
      const bp = data.filter(p => p.phase === 'brewing')
      const avgFlow = bp.length > 0 ? bp.reduce((s, p) => s + p.flowRate, 0) / bp.length : 0
      all.push({ power, quality, brewTime, peakPressure, avgFlow })
    }
    return all
  }, [stoveType, potSize, potMaterial, grindSize, altitude, startingWaterTemp])

  const best = useMemo(() => {
    let b = results[0]
    for (const r of results) { if (r.quality.score > b.quality.score) b = r }
    return b
  }, [results])

  const goodRange = useMemo(() => {
    const good = results.filter(r => r.quality.score >= 70)
    return good.length > 0 ? { min: good[0].power, max: good[good.length - 1].power } : null
  }, [results])

  const curve = useMemo(() => results.filter((_, i) => i % 3 === 0), [results])
  const maxScore = Math.max(...results.map(r => r.quality.score))

  const scoreColor = (s: number) => s >= 80 ? '#4ade80' : s >= 60 ? '#facc15' : '#f87171'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-coffee-100 flex items-center gap-2">
          🎯 Brew Optimizer
        </h2>
        <p className="text-xs sm:text-sm text-coffee-400 mt-1">
          Set your equipment — we'll find the ideal stove power.
        </p>
      </div>

      {/* Inputs — 2 columns on mobile, 3 on desktop */}
      <div className="space-y-3">
        {/* Row 1: Stove + Material */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-coffee-400 mb-1.5 font-medium">Stove Type</label>
            <div className="flex gap-1">
              {(['gas', 'electric', 'induction'] as const).map(type => (
                <button key={type} onClick={() => setStoveType(type)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    stoveType === type
                      ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                      : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                  }`}
                >
                  {type === 'gas' ? '🔥' : type === 'electric' ? '⚡' : '🧲'}
                </button>
              ))}
            </div>
            <div className="text-xs text-coffee-500 mt-0.5 text-center capitalize">{stoveType}</div>
          </div>

          <div>
            <label className="block text-xs text-coffee-400 mb-1.5 font-medium">Material</label>
            <div className="flex gap-1">
              {(['aluminum', 'stainless'] as const).map(mat => (
                <button key={mat} onClick={() => setPotMaterial(mat)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    potMaterial === mat
                      ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                      : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                  }`}
                >
                  {mat === 'aluminum' ? '🪶 Alu' : '🛡️ SS'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Pot Size */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1.5 font-medium">Pot Size</label>
          <div className="flex gap-1.5">
            {[1, 3, 6, 9, 12].map(size => (
              <button key={size} onClick={() => setPotSize(size)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  potSize === size
                    ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                    : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                }`}
              >
                {size}-cup
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Grind + Water Temp */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-coffee-400 mb-1.5 font-medium">
              Grind: <span className="text-coffee-200">{GRIND_LABELS[grindSize]}</span>
            </label>
            <input type="range" min={1} max={10} step={1} value={grindSize}
              onChange={e => setGrindSize(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-coffee-600 mt-0.5">
              <span>Fine</span><span>Coarse</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-coffee-400 mb-1.5 font-medium">Start Water</label>
            <div className="flex gap-1">
              {[{ t: 20, l: '🧊', n: 'Cold' }, { t: 50, l: '🌊', n: 'Warm' }, { t: 80, l: '♨️', n: 'Hot' }].map(({ t, l, n }) => (
                <button key={t} onClick={() => setStartingWaterTemp(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    startingWaterTemp === t
                      ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                      : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                  }`}
                >
                  {l}
                  <span className="hidden sm:inline"> {n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: Altitude */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1.5 font-medium">
            Altitude: <span className="text-coffee-200">{altitude}m</span>
          </label>
          <div className="flex gap-1 flex-wrap">
            {ALTITUDE_PRESETS.map(p => (
              <button key={p.name} onClick={() => setAltitude(p.altitude)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  altitude === p.altitude
                    ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                    : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ RESULT ═══ */}
      {best && (
        <div className="rounded-2xl p-4 sm:p-5" style={{
          background: `linear-gradient(135deg, rgba(20,12,4,0.85), rgba(${
            best.quality.score >= 80 ? '22,163,74' : best.quality.score >= 60 ? '202,138,4' : '220,38,38'
          },0.12))`,
          border: `1px solid ${scoreColor(best.quality.score)}33`,
        }}>
          <div className="text-xs text-coffee-400 uppercase tracking-wider mb-3 font-medium">
            ✨ Optimal Setting
          </div>

          {/* Big result — stacked on mobile */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl sm:text-4xl font-black" style={{
                color: scoreColor(best.quality.score),
                textShadow: `0 0 24px ${scoreColor(best.quality.score)}44`,
              }}>
                {best.power}W
              </div>
              <div className="text-coffee-400 text-xs sm:text-sm mt-0.5 capitalize">
                {stoveType} · {STOVE_PRESETS.find(p => p.type === stoveType && Math.abs(p.power - best.power) < 100)?.name.split(' - ')[1] || 'Custom'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-bold" style={{ color: scoreColor(best.quality.score) }}>
                {best.quality.score}
              </div>
              <div className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                best.quality.score >= 80 ? 'bg-green-900/50 text-green-300' :
                best.quality.score >= 60 ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-red-900/50 text-red-300'
              }`}>
                {best.quality.label}
              </div>
            </div>
          </div>

          {/* Stats — 2×2 on mobile, 4×1 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Brew Time', value: `${Math.floor(best.brewTime / 60)}:${(best.brewTime % 60).toString().padStart(2, '0')}` },
              { label: 'Peak Press.', value: `${best.peakPressure.toFixed(1)} bar` },
              { label: 'Avg Flow', value: `${best.avgFlow.toFixed(1)} mL/s` },
              { label: 'Good Range', value: goodRange ? `${goodRange.min}–${goodRange.max}W` : 'N/A' },
            ].map(stat => (
              <div key={stat.label} className="text-center rounded-lg p-2" style={{
                background: 'rgba(20,12,4,0.5)', border: '1px solid rgba(61,40,16,0.4)',
              }}>
                <div className="text-xs text-coffee-500">{stat.label}</div>
                <div className="text-xs sm:text-sm font-bold text-coffee-200 mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>

          <p className="text-xs sm:text-sm text-coffee-300 leading-relaxed">{best.quality.tip}</p>

          {/* Apply button */}
          <button
            onClick={() => onApply({
              stoveType, stovePower: best.power, grindSize, potMaterial, potSize, altitude, startingWaterTemp,
            })}
            className="mt-4 w-full py-3 rounded-xl font-semibold text-sm sm:text-base text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #a06b2a, #c48b3c)',
              boxShadow: '0 4px 14px rgba(160,107,42,0.4)',
            }}
          >
            ▶ Apply & Simulate at {best.power}W
          </button>
        </div>
      )}

      {/* Power vs Quality Curve */}
      <div className="rounded-xl p-3 sm:p-4" style={{
        background: 'rgba(20,12,4,0.5)', border: '1px solid rgba(61,40,16,0.4)',
      }}>
        <div className="text-xs text-coffee-400 uppercase tracking-wider mb-2 font-medium">
          Power vs Quality
        </div>
        <div className="relative h-24 sm:h-32">
          <div className="absolute left-0 top-0 text-xs text-coffee-600">100</div>
          <div className="absolute left-0 bottom-0 text-xs text-coffee-600">0</div>
          <div className="ml-6 h-full flex items-end gap-px">
            {curve.map((r, i) => {
              const isBest = r.power === best.power
              return (
                <div key={i} className="flex-1 rounded-t transition-all relative group"
                  style={{
                    height: `${(r.quality.score / maxScore) * 100}%`,
                    minWidth: 2,
                    background: isBest ? scoreColor(r.quality.score) : `${scoreColor(r.quality.score)}88`,
                    boxShadow: isBest ? `0 0 8px ${scoreColor(r.quality.score)}66` : 'none',
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap">
                    <div className="px-2 py-1 rounded text-xs font-medium" style={{
                      background: 'rgba(12,8,2,0.95)', border: '1px solid rgba(92,60,24,0.5)', color: '#f5e6cc',
                    }}>
                      {r.power}W → {r.quality.score}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="ml-6 flex justify-between mt-1">
            <span className="text-xs text-coffee-600">{curve[0]?.power}W</span>
            <span className="text-xs text-coffee-600">{curve[curve.length - 1]?.power}W</span>
          </div>
        </div>
      </div>

      {/* Research — collapsible on mobile */}
      <details className="rounded-xl" style={{
        background: 'rgba(20,12,4,0.3)', border: '1px solid rgba(61,40,16,0.25)',
      }}>
        <summary className="p-3 sm:p-4 text-xs text-coffee-400 uppercase tracking-wider font-medium cursor-pointer">
          📚 What the Research Says
        </summary>
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 text-xs text-coffee-500 space-y-1.5 leading-relaxed">
          <p>• <strong>Ideal brew time:</strong> 4–6 minutes total</p>
          <p>• <strong>Optimal pressure:</strong> 1–2 bar gauge</p>
          <p>• <strong>Best grind:</strong> 300–500μm (fine table salt)</p>
          <p>• <strong>Extraction temp:</strong> 92–96°C at coffee bed</p>
          <p>• <strong>Flow rate:</strong> 1.5–2 mL/s through grounds</p>
          <p>• <strong>Pro tip:</strong> Pre-heat water to 80°C to reduce thermal stress</p>
          <p className="text-coffee-600 italic mt-2">Sources: Siregar (2026), Navarini et al. (2009)</p>
        </div>
      </details>
    </div>
  )
}
