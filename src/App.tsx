import { useState, useEffect, useRef, useCallback } from 'react'
import { simulate, getBrewTime, getPeakPressure, boilingPoint } from './physics'
import type { MokaParams, SimulationPoint } from './physics'
import MokaPotDiagram from './components/MokaPotDiagram'
import ParameterPanel from './components/ParameterPanel'
import SimulationCharts from './components/SimulationCharts'
import MatchMyStove from './components/MatchMyStove'
import EducationPanel from './components/EducationPanel'

const DEFAULT_PARAMS: MokaParams = {
  stoveType: 'gas',
  stovePower: 1500,
  grindSize: 3,
  potMaterial: 'aluminum',
  potSize: 3,
  altitude: 0,
  startingWaterTemp: 20,
}

type Tab = 'simulation' | 'match' | 'learn'

export default function App() {
  const [params, setParams] = useState<MokaParams>(DEFAULT_PARAMS)
  const [simData, setSimData] = useState<SimulationPoint[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(10)
  const [activeTab, setActiveTab] = useState<Tab>('simulation')
  const animRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number>(0)

  // Run simulation when params change
  useEffect(() => {
    const data = simulate(params)
    setSimData(data)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [params])

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastFrameRef.current) lastFrameRef.current = timestamp
    const delta = (timestamp - lastFrameRef.current) / 1000
    lastFrameRef.current = timestamp

    setCurrentTime(prev => {
      const maxTime = simData[simData.length - 1]?.time || 0
      const next = prev + delta * playbackSpeed
      if (next >= maxTime) {
        setIsPlaying(false)
        return maxTime
      }
      return next
    })

    animRef.current = requestAnimationFrame(animate)
  }, [simData, playbackSpeed])

  useEffect(() => {
    if (isPlaying) {
      lastFrameRef.current = 0
      animRef.current = requestAnimationFrame(animate)
    } else if (animRef.current) {
      cancelAnimationFrame(animRef.current)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isPlaying, animate])

  const currentPoint = simData.find(p => p.time >= currentTime) || simData[simData.length - 1] || null
  const brewTime = getBrewTime(simData)
  const peakPressure = getPeakPressure(simData)
  const bp = boilingPoint(params.altitude)
  const maxTime = simData[simData.length - 1]?.time || 0

  const handlePlay = () => {
    if (currentTime >= maxTime) setCurrentTime(0)
    setIsPlaying(!isPlaying)
  }

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'simulation', label: 'Simulate', emoji: '📊' },
    { id: 'match', label: 'Match Stove', emoji: '🔄' },
    { id: 'learn', label: 'Learn', emoji: '📚' },
  ]

  // Playback controls — extracted so we can render in two places (inline lg, sticky mobile)
  const playbackControls = (
    <div className="space-y-2">
      <input
        type="range"
        min={0}
        max={maxTime}
        step={1}
        value={currentTime}
        onChange={e => {
          setCurrentTime(Number(e.target.value))
          setIsPlaying(false)
        }}
        className="w-full"
        style={{ margin: 0 }}
      />
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handlePlay}
          className="px-5 py-2.5 text-white rounded-xl font-semibold text-sm transition-all"
          style={{
            background: isPlaying
              ? 'linear-gradient(135deg, #7d5220, #a06b2a)'
              : 'linear-gradient(135deg, #a06b2a, #c48b3c)',
            boxShadow: '0 4px 14px rgba(160,107,42,0.35)',
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <span className="text-coffee-400 text-sm font-mono">
          {Math.round(currentTime)}s / {maxTime}s
        </span>
        <select
          value={playbackSpeed}
          onChange={e => setPlaybackSpeed(Number(e.target.value))}
          className="bg-coffee-800/50 border border-coffee-700/30 rounded-lg px-2 py-1.5 text-sm text-coffee-200"
        >
          <option value={1}>1×</option>
          <option value={5}>5×</option>
          <option value={10}>10×</option>
          <option value={25}>25×</option>
          <option value={50}>50×</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10"
        style={{
          background: 'rgba(20,12,4,0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(212,165,100,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-coffee-100 tracking-tight flex items-center gap-3">
                ☕ MokaSim
              </h1>
              <p className="text-coffee-500 text-sm mt-0.5">
                Moka pot thermodynamics simulator & stove matcher
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-coffee-500">
              <span
                className="px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(61,40,16,0.6)', border: '1px solid rgba(92,60,24,0.4)' }}
              >
                Real Physics
              </span>
              <span
                className="px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(61,40,16,0.6)', border: '1px solid rgba(92,60,24,0.4)' }}
              >
                Interactive
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="max-w-7xl mx-auto px-4 mt-5">
        <div
          className="flex gap-1 p-1 rounded-2xl"
          style={{
            background: 'rgba(30,20,8,0.6)',
            border: '1px solid rgba(92,60,24,0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={activeTab === tab.id ? {
                background: 'linear-gradient(135deg, #a06b2a, #c48b3c)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(160,107,42,0.4)',
              } : {
                color: '#7d5220',
              }}
            >
              <span className="mr-1.5">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 mt-5 pb-6 mobile-pb-playback">

        {/* === SIMULATION TAB === */}
        {activeTab === 'simulation' && (
          <div className="tab-content grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Left: Parameters */}
            <div className="lg:col-span-3">
              <div
                className="glass-panel rounded-2xl p-5 lg:sticky lg:top-24"
              >
                <ParameterPanel params={params} onChange={setParams} />
              </div>
            </div>

            {/* Center: Moka Pot Visualization */}
            <div className="lg:col-span-4">
              <div className="glass-panel rounded-2xl p-5">
                <MokaPotDiagram currentPoint={currentPoint} potMaterial={params.potMaterial} />

                {/* Playback Controls — hidden on mobile (shown in sticky bar) */}
                <div className="mt-6 space-y-3 hidden lg:block">
                  {playbackControls}
                </div>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    {
                      label: 'Brew Time',
                      value: `${Math.floor(brewTime / 60)}:${(brewTime % 60).toString().padStart(2, '0')}`,
                      color: 'text-amber-400',
                    },
                    {
                      label: 'Peak Press.',
                      value: `${peakPressure.toFixed(2)} bar`,
                      color: 'text-indigo-300',
                    },
                    {
                      label: 'Boil Point',
                      value: `${bp.toFixed(1)}°C`,
                      color: 'text-coffee-200',
                    },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-xl p-2.5"
                      style={{
                        background: 'rgba(20,12,4,0.5)',
                        border: '1px solid rgba(61,40,16,0.5)',
                      }}
                    >
                      <div className="text-xs text-coffee-500 mb-0.5">{stat.label}</div>
                      <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Charts */}
            <div className="lg:col-span-5">
              <div className="glass-panel rounded-2xl p-5">
                <SimulationCharts data={simData} currentTime={currentTime} />
              </div>
            </div>
          </div>
        )}

        {/* === MATCH TAB === */}
        {activeTab === 'match' && (
          <div className="tab-content max-w-xl mx-auto space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <MatchMyStove currentParams={params} />
            </div>

            {/* Current params summary */}
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-sm font-medium text-coffee-300 mb-3">Current Configuration</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: 'Stove', main: params.stoveType, sub: `${params.stovePower}W` },
                  { label: 'Pot', main: params.potMaterial, sub: `${params.potSize}-cup` },
                  { label: 'Grind', main: `Level ${params.grindSize}`, sub: '' },
                  { label: 'Altitude', main: `${params.altitude}m`, sub: '' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(20,12,4,0.5)', border: '1px solid rgba(61,40,16,0.5)' }}
                  >
                    <div className="text-xs text-coffee-500">{item.label}</div>
                    <div className="text-sm font-bold text-coffee-200 capitalize mt-0.5">{item.main}</div>
                    {item.sub && <div className="text-xs text-coffee-400">{item.sub}</div>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-coffee-500 mt-3 text-center">
                Adjust parameters in the Simulate tab, then come back here to save & match
              </p>
            </div>
          </div>
        )}

        {/* === LEARN TAB === */}
        {activeTab === 'learn' && (
          <div className="tab-content max-w-2xl mx-auto">
            <div className="glass-panel rounded-2xl p-6">
              <EducationPanel altitude={params.altitude} />
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky Mobile Playback Bar (only on simulation tab, < lg) ── */}
      {activeTab === 'simulation' && (
        <div className="playback-sticky lg:hidden">
          {playbackControls}
        </div>
      )}

      {/* ── Footer ── */}
      <footer
        className="mt-8 py-6 hidden lg:block"
        style={{ borderTop: '1px solid rgba(92,60,24,0.2)' }}
      >
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-coffee-700">
          Built with real thermodynamics · Q=mcΔT · Darcy's Law · Clausius-Clapeyron
        </div>
      </footer>
    </div>
  )
}
