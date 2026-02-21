import { STOVE_PRESETS, ALTITUDE_PRESETS } from '../physics'
import type { MokaParams } from '../physics'

interface Props {
  params: MokaParams
  onChange: (params: MokaParams) => void
}

const STOVE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  gas: { min: 500, max: 5000, unit: 'W (≈1,700-17,000 BTU)' },
  electric: { min: 300, max: 3000, unit: 'W' },
  induction: { min: 200, max: 2500, unit: 'W' },
}

const GRIND_LABELS = ['', 'Extra Fine', 'Very Fine', 'Fine', 'Med-Fine', 'Medium', 'Med-Coarse', 'Coarse', 'Very Coarse', 'Extra Coarse', 'Turkish Coarse']

export default function ParameterPanel({ params, onChange }: Props) {
  const update = (key: keyof MokaParams, value: number | string) => {
    onChange({ ...params, [key]: value })
  }

  const range = STOVE_RANGES[params.stoveType]

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-coffee-200 flex items-center gap-2">
        ⚙️ Parameters
      </h2>

      {/* Stove Type */}
      <div>
        <label className="block text-sm text-coffee-300 mb-2 font-medium">Stove Type</label>
        <div className="grid grid-cols-3 gap-2">
          {(['gas', 'electric', 'induction'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                const newRange = STOVE_RANGES[type]
                update('stoveType', type)
                if (params.stovePower < newRange.min || params.stovePower > newRange.max) {
                  onChange({ ...params, stoveType: type, stovePower: Math.round((newRange.min + newRange.max) / 2) })
                }
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={params.stoveType === type ? {
                background: 'linear-gradient(135deg, #a06b2a, #c48b3c)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(160,107,42,0.35)',
              } : {
                background: 'rgba(61,40,16,0.5)',
                color: '#d4a564',
                border: '1px solid rgba(92,60,24,0.3)',
              }}
            >
              {type === 'gas' ? '🔥 Gas' : type === 'electric' ? '⚡ Electric' : '🧲 Induction'}
            </button>
          ))}
        </div>
        <p className="text-xs text-coffee-500 mt-1">
          Efficiency: Gas 40% · Electric 70% · Induction 85%
        </p>
      </div>

      {/* Stove Power */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm text-coffee-300 font-medium">Stove Power</label>
          <span className="text-coffee-100 font-bold">{params.stovePower}W</span>
        </div>
        {/* Quick presets */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {STOVE_PRESETS.filter(p => p.type === params.stoveType).map(preset => (
            <button
              key={preset.name}
              onClick={() => update('stovePower', preset.power)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                params.stovePower === preset.power
                  ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                  : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30 hover:bg-coffee-700/50'
              }`}
            >
              {preset.name.split(' - ')[1]}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={50}
          value={params.stovePower}
          onChange={e => update('stovePower', Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-coffee-600 mt-1">
          <span>Low ({range.min}W)</span>
          <span>High ({range.max}W)</span>
        </div>
      </div>

      {/* Pot Size */}
      <div>
        <label className="block text-sm text-coffee-300 mb-2 font-medium">Pot Size</label>
        <div className="flex gap-2 flex-wrap">
          {[1, 3, 6, 9, 12].map(size => (
            <button
              key={size}
              onClick={() => update('potSize', size)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={params.potSize === size ? {
                background: 'linear-gradient(135deg, #a06b2a, #c48b3c)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(160,107,42,0.35)',
              } : {
                background: 'rgba(61,40,16,0.5)',
                color: '#d4a564',
                border: '1px solid rgba(92,60,24,0.3)',
              }}
            >
              {size}-cup
            </button>
          ))}
        </div>
      </div>

      {/* Pot Material */}
      <div>
        <label className="block text-sm text-coffee-300 mb-2 font-medium">Pot Material</label>
        <div className="grid grid-cols-2 gap-2">
          {(['aluminum', 'stainless'] as const).map(mat => (
            <button
              key={mat}
              onClick={() => update('potMaterial', mat)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={params.potMaterial === mat ? {
                background: 'linear-gradient(135deg, #a06b2a, #c48b3c)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(160,107,42,0.35)',
              } : {
                background: 'rgba(61,40,16,0.5)',
                color: '#d4a564',
                border: '1px solid rgba(92,60,24,0.3)',
              }}
            >
              {mat === 'aluminum' ? '🪶 Aluminum' : '🛡️ Stainless Steel'}
            </button>
          ))}
        </div>
        <p className="text-xs text-coffee-500 mt-1">
          Thermal conductivity: Al {205} vs SS {16} W/m·K
        </p>
      </div>

      {/* Grind Size */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm text-coffee-300 font-medium">Grind Size</label>
          <span className="text-coffee-100 font-bold text-sm">{GRIND_LABELS[params.grindSize]}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={params.grindSize}
          onChange={e => update('grindSize', Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-coffee-600 mt-1">
          <span>Fine (espresso)</span>
          <span>Coarse</span>
        </div>
      </div>

      {/* Starting Water Temp */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm text-coffee-300 font-medium">Starting Water Temp</label>
          <span className="text-coffee-100 font-bold">{params.startingWaterTemp}°C</span>
        </div>
        <input
          type="range"
          min={15}
          max={90}
          step={1}
          value={params.startingWaterTemp}
          onChange={e => update('startingWaterTemp', Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-coffee-600 mt-1">
          <span>Cold (15°C)</span>
          <span>Hot (90°C)</span>
        </div>
      </div>

      {/* Altitude */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm text-coffee-300 font-medium">Altitude</label>
          <span className="text-coffee-100 font-bold">{params.altitude}m ({(params.altitude * 3.281).toFixed(0)}ft)</span>
        </div>
        {/* City presets */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {ALTITUDE_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => update('altitude', preset.altitude)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                params.altitude === preset.altitude
                  ? 'bg-amber-700/60 text-amber-100 border border-amber-500/50'
                  : 'bg-coffee-800/40 text-coffee-400 border border-coffee-700/30 hover:bg-coffee-700/50'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={4000}
          step={50}
          value={params.altitude}
          onChange={e => update('altitude', Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-coffee-600 mt-1">
          <span>Sea level</span>
          <span>4,000m</span>
        </div>
      </div>
    </div>
  )
}
