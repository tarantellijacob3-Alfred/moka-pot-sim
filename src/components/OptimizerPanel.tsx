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
  // Locked inputs — user sets these as constants
  const [stoveType, setStoveType] = useState(currentParams.stoveType)
  const [potSize, setPotSize] = useState(currentParams.potSize)
  const [potMaterial, setPotMaterial] = useState(currentParams.potMaterial)
  const [grindSize, setGrindSize] = useState(currentParams.grindSize)
  const [altitude, setAltitude] = useState(currentParams.altitude)
  const [startingWaterTemp, setStartingWaterTemp] = useState(currentParams.startingWaterTemp)

  // Run optimizer: sweep stove power from 200-5000W and find best brew quality
  const results = useMemo(() => {
    const stoveRange = stoveType === 'gas'
      ? { min: 300, max: 5000, step: 50 }
      : stoveType === 'electric'
      ? { min: 200, max: 3000, step: 50 }
      : { min: 100, max: 2500, step: 50 }

    const allResults: OptimizationResult[] = []

    for (let power = stoveRange.min; power <= stoveRange.max; power += stoveRange.step) {
      const params: MokaParams = {
        stoveType,
        stovePower: power,
        grindSize,
        potMaterial,
        potSize,
        altitude,
        startingWaterTemp,
      }
      const data = simulate(params)
      const quality = getBrewQuality(data, params)
      const brewTime = getBrewTime(data)
      const peakPressure = getPeakPressure(data)
      const brewingPoints = data.filter(p => p.phase === 'brewing')
      const avgFlow = brewingPoints.length > 0
        ? brewingPoints.reduce((s, p) => s + p.flowRate, 0) / brewingPoints.length
        : 0

      allResults.push({ power, quality, brewTime, peakPressure, avgFlow })
    }

    return allResults
  }, [stoveType, potSize, potMaterial, grindSize, altitude, startingWaterTemp])

  // Find best result
  const best = useMemo(() => {
    let bestResult = results[0]
    for (const r of results) {
      if (r.quality.score > bestResult.quality.score) bestResult = r
    }
    return bestResult
  }, [results])

  // Find acceptable range (score >= 70)
  const goodRange = useMemo(() => {
    const good = results.filter(r => r.quality.score >= 70)
    if (good.length === 0) return null
    return {
      min: good[0].power,
      max: good[good.length - 1].power,
    }
  }, [results])

  // Build a simplified "power vs quality" curve for visualization
  const curve = useMemo(() => {
    // Sample every 5th result for the mini chart
    return results.filter((_, i) => i % 3 === 0)
  }, [results])

  const maxScore = Math.max(...results.map(r => r.quality.score))

  const scoreColor = (score: number) =>
    score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-coffee-100 flex items-center gap-2">
          🎯 Brew Optimizer
        </h2>
        <p className="text-sm text-coffee-400 mt-1">
          Set your equipment and conditions — we'll find the ideal stove power.
        </p>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Stove Type */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1 font-medium">Stove Type</label>
          <div className="flex gap-1">
            {(['gas', 'electric', 'induction'] as const).map(type => (
              <button
                key={type}
                onClick={() => setStoveType(type)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  stoveType === type
                    ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                    : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                }`}
              >
                {type === 'gas' ? '🔥' : type === 'electric' ? '⚡' : '🧲'} {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Pot Size */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1 font-medium">Pot Size</label>
          <div className="flex gap-1">
            {[1, 3, 6, 9, 12].map(size => (
              <button
                key={size}
                onClick={() => setPotSize(size)}
                className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  potSize === size
                    ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                    : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Material */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1 font-medium">Material</label>
          <div className="flex gap-1">
            {(['aluminum', 'stainless'] as const).map(mat => (
              <button
                key={mat}
                onClick={() => setPotMaterial(mat)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
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

        {/* Grind */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1 font-medium">
            Grind: {GRIND_LABELS[grindSize]}
          </label>
          <input
            type="range" min={1} max={10} step={1}
            value={grindSize}
            onChange={e => setGrindSize(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Altitude */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1 font-medium">
            Altitude: {altitude}m
          </label>
          <div className="flex gap-1 flex-wrap">
            {ALTITUDE_PRESETS.slice(0, 3).map(p => (
              <button
                key={p.name}
                onClick={() => setAltitude(p.altitude)}
                className={`px-2 py-1 rounded text-xs transition-all ${
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

        {/* Water Temp */}
        <div>
          <label className="block text-xs text-coffee-400 mb-1 font-medium">
            Start Temp: {startingWaterTemp}°C
          </label>
          <div className="flex gap-1">
            {[20, 50, 80].map(t => (
              <button
                key={t}
                onClick={() => setStartingWaterTemp(t)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  startingWaterTemp === t
                    ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                    : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30'
                }`}
              >
                {t === 20 ? '🧊 Cold' : t === 50 ? '🌊 Warm' : '♨️ Hot'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Optimal Result */}
      {best && (
        <div className="rounded-xl p-5" style={{
          background: `linear-gradient(135deg, rgba(20,12,4,0.8), rgba(${
            best.quality.score >= 80 ? '22,163,74' : best.quality.score >= 60 ? '202,138,4' : '220,38,38'
          },0.15))`,
          border: `1px solid ${scoreColor(best.quality.score)}33`,
        }}>
          <div className="text-xs text-coffee-400 uppercase tracking-wider mb-3 font-medium">
            Optimal Setting Found
          </div>

          <div className="flex items-end gap-4 mb-4">
            <div>
              <div className="text-4xl font-black" style={{
                color: scoreColor(best.quality.score),
                textShadow: `0 0 24px ${scoreColor(best.quality.score)}44`,
              }}>
                {best.power}W
              </div>
              <div className="text-coffee-400 text-sm mt-0.5">
                {stoveType} stove setting
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold" style={{ color: scoreColor(best.quality.score) }}>
                {best.quality.score}/100
              </div>
              <div className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block ${
                best.quality.score >= 80 ? 'bg-green-900/50 text-green-300' :
                best.quality.score >= 60 ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-red-900/50 text-red-300'
              }`}>
                {best.quality.label}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Brew Time', value: `${Math.floor(best.brewTime / 60)}:${(best.brewTime % 60).toString().padStart(2, '0')}` },
              { label: 'Peak Pressure', value: `${best.peakPressure.toFixed(1)} bar` },
              { label: 'Avg Flow', value: `${best.avgFlow.toFixed(1)} mL/s` },
              { label: 'Stove Preset', value: STOVE_PRESETS.find(p => p.type === stoveType && Math.abs(p.power - best.power) < 100)?.name.split(' - ')[1] || `${best.power}W` },
            ].map(stat => (
              <div key={stat.label} className="text-center rounded-lg p-2" style={{
                background: 'rgba(20,12,4,0.5)',
                border: '1px solid rgba(61,40,16,0.4)',
              }}>
                <div className="text-xs text-coffee-500">{stat.label}</div>
                <div className="text-sm font-bold text-coffee-200 mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>

          <p className="text-sm text-coffee-300 leading-relaxed">{best.quality.tip}</p>

          {goodRange && (
            <p className="text-xs text-coffee-500 mt-2">
              ✅ Good range ({'\u2265'}70 score): {goodRange.min}W – {goodRange.max}W
            </p>
          )}

          {/* Apply button */}
          <button
            onClick={() => onApply({
              stoveType,
              stovePower: best.power,
              grindSize,
              potMaterial,
              potSize,
              altitude,
              startingWaterTemp,
            })}
            className="mt-4 w-full py-3 rounded-xl font-semibold text-white transition-all"
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
      <div className="rounded-xl p-4" style={{
        background: 'rgba(20,12,4,0.5)',
        border: '1px solid rgba(61,40,16,0.4)',
      }}>
        <div className="text-xs text-coffee-400 uppercase tracking-wider mb-3 font-medium">
          Power vs Brew Quality
        </div>
        <div className="relative h-32">
          {/* Y axis labels */}
          <div className="absolute left-0 top-0 text-xs text-coffee-600">100</div>
          <div className="absolute left-0 bottom-0 text-xs text-coffee-600">0</div>

          {/* Bar chart */}
          <div className="ml-6 h-full flex items-end gap-px">
            {curve.map((r, i) => {
              const height = `${(r.quality.score / maxScore) * 100}%`
              const isBest = r.power === best.power
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all relative group"
                  style={{
                    height,
                    minWidth: 3,
                    background: isBest
                      ? scoreColor(r.quality.score)
                      : `${scoreColor(r.quality.score)}88`,
                    boxShadow: isBest ? `0 0 8px ${scoreColor(r.quality.score)}66` : 'none',
                  }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap">
                    <div className="px-2 py-1 rounded text-xs font-medium" style={{
                      background: 'rgba(12,8,2,0.95)',
                      border: '1px solid rgba(92,60,24,0.5)',
                      color: '#f5e6cc',
                    }}>
                      {r.power}W → {r.quality.score} {r.quality.label}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* X axis labels */}
          <div className="ml-6 flex justify-between mt-1">
            <span className="text-xs text-coffee-600">{curve[0]?.power}W</span>
            <span className="text-xs text-coffee-600">{curve[curve.length - 1]?.power}W</span>
          </div>
        </div>
      </div>

      {/* Research notes */}
      <div className="rounded-xl p-4" style={{
        background: 'rgba(20,12,4,0.3)',
        border: '1px solid rgba(61,40,16,0.25)',
      }}>
        <div className="text-xs text-coffee-400 uppercase tracking-wider mb-2 font-medium">
          📚 What the Research Says
        </div>
        <div className="text-xs text-coffee-500 space-y-1.5 leading-relaxed">
          <p>• <strong>Ideal total brew time:</strong> 4–6 minutes (heating + extraction)</p>
          <p>• <strong>Optimal pressure:</strong> 1–2 bar gauge (sweet spot for flavor without bitterness)</p>
          <p>• <strong>Best grind:</strong> 300–500μm (fine table salt), grind 3–4 on most grinders</p>
          <p>• <strong>Extraction temp:</strong> 92–96°C at the coffee bed</p>
          <p>• <strong>Flow rate:</strong> 1.5–2 mL/s through the grounds</p>
          <p>• <strong>Pro tip:</strong> Pre-heat water to 80°C to reduce heating time and thermal stress on coffee</p>
          <p className="text-coffee-600 italic mt-2">Sources: Siregar (2026), Navarini et al. (2009), King (2008)</p>
        </div>
      </div>
    </div>
  )
}
