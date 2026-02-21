import { useState } from 'react'
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

  const matchedPower = selectedSetup ? matchStove(selectedSetup.params, targetStove) : null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-coffee-200 flex items-center gap-2">
        🔄 Match My Stove
      </h2>
      <p className="text-sm text-coffee-400">
        Save your working setup, then find the equivalent power on any new stove.
      </p>

      {/* Save current setup */}
      <div className="bg-coffee-800/30 rounded-xl p-4 border border-coffee-700/30">
        <h3 className="text-sm font-medium text-coffee-300 mb-2">Save Current Setup</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={setupName}
            onChange={e => setSetupName(e.target.value)}
            placeholder="e.g. Kitchen gas stove"
            className="flex-1 bg-coffee-900/50 border border-coffee-700/30 rounded-lg px-3 py-2 text-sm text-coffee-100 placeholder-coffee-600 focus:outline-none focus:border-coffee-500"
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
                  ? 'bg-coffee-500/20 border border-coffee-500/50'
                  : 'bg-coffee-800/30 border border-coffee-700/20 hover:border-coffee-600/40'
              }`}
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
                className="text-coffee-600 hover:text-red-400 text-sm p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Match to new stove */}
      {selectedSetup && (
        <div className="bg-gradient-to-br from-coffee-700/30 to-coffee-800/30 rounded-xl p-4 border border-coffee-500/30">
          <h3 className="text-sm font-medium text-coffee-200 mb-3">
            Match "{selectedSetup.name}" to a new stove:
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['gas', 'electric', 'induction'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTargetStove(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  targetStove === type
                    ? 'bg-coffee-500 text-white shadow-lg'
                    : 'bg-coffee-800/50 text-coffee-300 hover:bg-coffee-700/50'
                }`}
              >
                {type === 'gas' ? '🔥' : type === 'electric' ? '⚡' : '🧲'} {type}
              </button>
            ))}
          </div>

          {matchedPower && (
            <div className="text-center p-4 bg-coffee-900/50 rounded-xl">
              <div className="text-coffee-400 text-sm mb-1">Set your {targetStove} stove to:</div>
              <div className="text-4xl font-bold text-coffee-100">{matchedPower}W</div>
              <div className="text-xs text-coffee-500 mt-2">
                This delivers the same effective heat as your {selectedSetup.params.stoveType} at {selectedSetup.params.stovePower}W
              </div>
              {targetStove === 'gas' && (
                <div className="text-xs text-coffee-400 mt-1">
                  ≈ {(matchedPower * 3.412).toFixed(0)} BTU/hr
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
