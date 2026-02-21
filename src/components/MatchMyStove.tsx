import { useState, useEffect, useRef } from 'react'
import { matchStove } from '../physics'
import type { MokaParams } from '../physics'

interface Props {
  currentParams: MokaParams
}

interface SavedSetup {
  name: string
  params: MokaParams
}

export default function MatchMyStove({ currentParams }: Props) {
  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>(() => {
    try {
      const stored = localStorage.getItem('moka-saved-setups')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [setupName, setSetupName] = useState('')
  const [selectedSetup, setSelectedSetup] = useState<SavedSetup | null>(null)
  const [targetStove, setTargetStove] = useState<'gas' | 'electric' | 'induction'>('electric')
  const [resultKey, setResultKey] = useState(0)
  const prevPower = useRef<number | null>(null)

  const matchedPower = selectedSetup ? matchStove(selectedSetup.params, targetStove) : null

  // Re-trigger animation whenever result changes
  useEffect(() => {
    if (matchedPower !== null && matchedPower !== prevPower.current) {
      prevPower.current = matchedPower
      setResultKey(k => k + 1)
    }
  }, [matchedPower])

  const saveSetup = () => {
    if (!setupName.trim()) return
    const newSetup: SavedSetup = { name: setupName.trim(), params: { ...currentParams } }
    const updated = [...savedSetups, newSetup]
    setSavedSetups(updated)
    localStorage.setItem('moka-saved-setups', JSON.stringify(updated))
    setSetupName('')
  }

  const deleteSetup = (index: number) => {
    const updated = savedSetups.filter((_, i) => i !== index)
    setSavedSetups(updated)
    localStorage.setItem('moka-saved-setups', JSON.stringify(updated))
    if (selectedSetup === savedSetups[index]) setSelectedSetup(null)
  }

  const efficiencyLabel: Record<string, string> = {
    gas: '40% eff.',
    electric: '70% eff.',
    induction: '85% eff.',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-coffee-200 flex items-center gap-2">
        🔄 Match My Stove
      </h2>
      <p className="text-sm text-coffee-400">
        Save your working setup, then find the equivalent power on any new stove.
      </p>

      {/* Save current setup */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-medium text-coffee-300 mb-2">Save Current Setup</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={setupName}
            onChange={e => setSetupName(e.target.value)}
            placeholder="e.g. Kitchen gas stove"
            className="flex-1 bg-coffee-900/50 border border-coffee-700/30 rounded-lg px-3 py-2.5 text-sm text-coffee-100 placeholder-coffee-600 focus:outline-none focus:border-coffee-500"
            onKeyDown={e => e.key === 'Enter' && saveSetup()}
          />
          <button
            onClick={saveSetup}
            className="px-4 py-2 bg-coffee-500 text-white rounded-lg text-sm font-medium hover:bg-coffee-400 transition-colors"
          >
            Save
          </button>
        </div>
        <div className="text-xs text-coffee-500 mt-2">
          Saves: {currentParams.stoveType} @ {currentParams.stovePower}W · {currentParams.potSize}-cup {currentParams.potMaterial} · grind {currentParams.grindSize}
        </div>
      </div>

      {/* Saved setups */}
      {savedSetups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-coffee-300">Your Saved Setups</h3>
          {savedSetups.map((setup, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedSetup === setup
                  ? 'border border-coffee-500/50'
                  : 'glass-panel glass-panel-hover'
              }`}
              style={selectedSetup === setup ? {
                background: 'rgba(160,107,42,0.18)',
                border: '1px solid rgba(160,107,42,0.4)',
                boxShadow: '0 0 16px rgba(160,107,42,0.12)',
              } : {}}
              onClick={() => setSelectedSetup(setup)}
            >
              <div>
                <div className="text-sm font-medium text-coffee-200">{setup.name}</div>
                <div className="text-xs text-coffee-500">
                  {setup.params.stoveType} @ {setup.params.stovePower}W · {setup.params.potSize}-cup {setup.params.potMaterial}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteSetup(i) }}
                className="text-coffee-600 hover:text-red-400 text-sm p-1.5 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Match to new stove */}
      {selectedSetup && (
        <div
          className="rounded-xl p-5 border"
          style={{
            background: 'linear-gradient(135deg, rgba(61,40,16,0.35), rgba(30,20,8,0.5))',
            borderColor: 'rgba(212,165,100,0.2)',
            boxShadow: 'inset 0 1px 0 rgba(212,165,100,0.07)',
          }}
        >
          <h3 className="text-sm font-medium text-coffee-200 mb-3">
            Match <span className="text-coffee-300 font-bold">"{selectedSetup.name}"</span> to a new stove:
          </h3>

          {/* Stove type selector */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {(['gas', 'electric', 'induction'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTargetStove(type)}
                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  targetStove === type
                    ? 'text-white'
                    : 'text-coffee-300 hover:text-coffee-200'
                }`}
                style={targetStove === type ? {
                  background: 'linear-gradient(135deg, #a06b2a, #c48b3c)',
                  boxShadow: '0 4px 16px rgba(160,107,42,0.4)',
                } : {
                  background: 'rgba(61,40,16,0.5)',
                  border: '1px solid rgba(92,60,24,0.3)',
                }}
              >
                <div className="text-xl mb-0.5">
                  {type === 'gas' ? '🔥' : type === 'electric' ? '⚡' : '🧲'}
                </div>
                <div className="capitalize">{type}</div>
                <div className="text-xs opacity-60 mt-0.5">{efficiencyLabel[type]}</div>
              </button>
            ))}
          </div>

          {/* Big result */}
          {matchedPower !== null && (
            <div
              key={resultKey}
              className="result-pop text-center py-6 px-4 rounded-2xl"
              style={{
                background: 'linear-gradient(160deg, rgba(20,12,4,0.8), rgba(40,24,10,0.7))',
                border: '1px solid rgba(212,165,100,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,165,100,0.08)',
              }}
            >
              <div className="text-coffee-400 text-sm mb-2 tracking-wide">
                Set your {targetStove} stove to
              </div>
              <div
                className="font-black text-coffee-100 tabular-nums"
                style={{
                  fontSize: 'clamp(3rem, 8vw, 5rem)',
                  lineHeight: 1,
                  textShadow: '0 0 40px rgba(212,165,100,0.3)',
                  letterSpacing: '-0.02em',
                }}
              >
                {matchedPower.toLocaleString()}
              </div>
              <div
                className="font-semibold text-coffee-400 mt-1"
                style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}
              >
                watts
              </div>
              <div className="text-xs text-coffee-500 mt-3 leading-relaxed">
                Equivalent to {selectedSetup.params.stoveType} @ {selectedSetup.params.stovePower}W
              </div>
              {targetStove === 'gas' && (
                <div
                  className="inline-block mt-2 px-3 py-1 rounded-full text-xs text-coffee-300"
                  style={{ background: 'rgba(61,40,16,0.5)', border: '1px solid rgba(92,60,24,0.3)' }}
                >
                  ≈ {(matchedPower * 3.412).toFixed(0)} BTU/hr
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedSetup && savedSetups.length === 0 && (
        <div className="text-center py-8 text-coffee-600 text-sm">
          <div className="text-3xl mb-2">💾</div>
          Save a setup above to get started
        </div>
      )}
      {!selectedSetup && savedSetups.length > 0 && (
        <div className="text-center py-4 text-coffee-600 text-sm">
          Select a saved setup above to match
        </div>
      )}
    </div>
  )
}
