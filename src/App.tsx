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
    const delta = (timestamp - lastFrameRef.current) / 1000 // seconds
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

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="border-b border-coffee-700/30 bg-coffee-900/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-coffee-100 flex items-center gap-3">
                ☕ MokaSim
              </h1>
              <p className="text-coffee-500 text-sm mt-0.5">
                Moka pot thermodynamics simulator & stove matcher
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-coffee-600">
              <span className="px-2 py-1 bg-coffee-800/50 rounded-full">Real Physics</span>
              <span className="px-2 py-1 bg-coffee-800/50 rounded-full">Interactive</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-2 sm:gap-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-coffee-500 text-white shadow-lg shadow-coffee-500/20'
                  : 'bg-coffee-800/40 text-coffee-400 hover:bg-coffee-700/40 hover:text-coffee-300'
              }`}
            >
              <span className="mr-1.5">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {activeTab === 'simulation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Parameters */}
            <div className="lg:col-span-3">
              <div className="bg-coffee-800/20 rounded-2xl p-5 border border-coffee-700/20 sticky top-24">
                <ParameterPanel params={params} onChange={setParams} />
              </div>
            </div>

            {/* Center: Moka Pot Visualization */}
            <div className="lg:col-span-4">
              <div className="bg-coffee-800/20 rounded-2xl p-5 border border-coffee-700/20">
                <MokaPotDiagram currentPoint={currentPoint} potMaterial={params.potMaterial} />

                {/* Playback Controls */}
                <div className="mt-6 space-y-3">
                  {/* Timeline slider */}
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
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePlay}
                      className="px-5 py-2 bg-coffee-500 text-white rounded-lg font-medium hover:bg-coffee-400 transition-colors text-sm"
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

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-coffee-900/40 rounded-lg p-2">
                    <div className="text-xs text-coffee-500">Brew Time</div>
                    <div className="text-sm font-bold text-coffee-200">
                      {Math.floor(brewTime / 60)}:{(brewTime % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  <div className="bg-coffee-900/40 rounded-lg p-2">
                    <div className="text-xs text-coffee-500">Peak Press.</div>
                    <div className="text-sm font-bold text-coffee-200">{peakPressure.toFixed(2)} bar</div>
                  </div>
                  <div className="bg-coffee-900/40 rounded-lg p-2">
                    <div className="text-xs text-coffee-500">Boil Point</div>
                    <div className="text-sm font-bold text-coffee-200">{bp.toFixed(1)}°C</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Charts */}
            <div className="lg:col-span-5">
              <div className="bg-coffee-800/20 rounded-2xl p-5 border border-coffee-700/20">
                <SimulationCharts data={simData} currentTime={currentTime} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'match' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-coffee-800/20 rounded-2xl p-6 border border-coffee-700/20">
              <MatchMyStove currentParams={params} />
            </div>

            {/* Current params summary */}
            <div className="mt-4 bg-coffee-800/20 rounded-2xl p-5 border border-coffee-700/20">
              <h3 className="text-sm font-medium text-coffee-300 mb-3">Current Configuration</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-coffee-900/40 rounded-lg p-3">
                  <div className="text-xs text-coffee-500">Stove</div>
                  <div className="text-sm font-bold text-coffee-200 capitalize">{params.stoveType}</div>
                  <div className="text-xs text-coffee-400">{params.stovePower}W</div>
                </div>
                <div className="bg-coffee-900/40 rounded-lg p-3">
                  <div className="text-xs text-coffee-500">Pot</div>
                  <div className="text-sm font-bold text-coffee-200 capitalize">{params.potMaterial}</div>
                  <div className="text-xs text-coffee-400">{params.potSize}-cup</div>
                </div>
                <div className="bg-coffee-900/40 rounded-lg p-3">
                  <div className="text-xs text-coffee-500">Grind</div>
                  <div className="text-sm font-bold text-coffee-200">Level {params.grindSize}</div>
                </div>
                <div className="bg-coffee-900/40 rounded-lg p-3">
                  <div className="text-xs text-coffee-500">Altitude</div>
                  <div className="text-sm font-bold text-coffee-200">{params.altitude}m</div>
                </div>
              </div>
              <p className="text-xs text-coffee-500 mt-3 text-center">
                Adjust parameters in the Simulate tab, then come back here to save & match
              </p>
            </div>
          </div>
        )}

        {activeTab === 'learn' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-coffee-800/20 rounded-2xl p-6 border border-coffee-700/20">
              <EducationPanel altitude={params.altitude} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-coffee-700/20 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-coffee-600">
          Built with real thermodynamics · Q=mcΔT · Darcy's Law · Clausius-Clapeyron
        </div>
      </footer>
    </div>
  )
}
