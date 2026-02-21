import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceLine
} from 'recharts'
import type { SimulationPoint } from '../physics'

interface Props {
  data: SimulationPoint[]
  currentTime: number
}

interface TooltipPayloadItem {
  value: number
  name: string
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: number
  unit?: string
  formatter?: (v: number) => string
}

function CustomTooltip({ active, payload, label, unit = '', formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  const display = formatter ? formatter(val) : `${val}${unit}`
  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(20,12,4,0.97), rgba(40,24,10,0.95))',
        border: '1px solid rgba(212,165,100,0.3)',
        borderRadius: '10px',
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,165,100,0.1)',
        fontSize: '12px',
        color: '#f5e6cc',
        minWidth: '100px',
      }}
    >
      <div style={{ color: '#7d5220', marginBottom: 3, fontSize: 11 }}>⏱ {label}s</div>
      <div style={{ color: payload[0]?.color ?? '#f5e6cc', fontWeight: 700, fontSize: 14 }}>
        {display}
      </div>
    </div>
  )
}

// Find the time at which each phase transition happens
function getPhaseTransitions(data: SimulationPoint[]) {
  let brewStart: number | null = null
  let doneStart: number | null = null
  for (const p of data) {
    if (p.phase === 'brewing' && brewStart === null) brewStart = p.time
    if (p.phase === 'done' && doneStart === null) doneStart = p.time
  }
  return { brewStart, doneStart }
}

const CHART_STYLE = {
  background: 'linear-gradient(160deg, rgba(20,12,4,0.6), rgba(30,20,8,0.4))',
  borderRadius: '14px',
  border: '1px solid rgba(92,60,24,0.3)',
  padding: '14px 8px 8px',
}

const GRID_COLOR = 'rgba(61,40,16,0.6)'
const AXIS_COLOR = '#5c3c18'

export default function SimulationCharts({ data, currentTime }: Props) {
  const visibleData = data.filter(p => p.time <= currentTime)
  const { brewStart, doneStart } = getPhaseTransitions(data)

  const refLineProps = {
    strokeDasharray: '4 3' as const,
    strokeWidth: 1.5,
    ifOverflow: 'visible' as const,
  }

  return (
    <div className="space-y-5">

      {/* Phase legend */}
      {(brewStart !== null || doneStart !== null) && (
        <div className="flex items-center gap-4 text-xs text-coffee-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-amber-500/70" />
            Brewing starts
          </span>
          {doneStart !== null && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 border-t border-dashed border-brew-400/70" />
              Done
            </span>
          )}
        </div>
      )}

      {/* Temperature Chart */}
      <div>
        <h3 className="text-xs font-semibold text-coffee-400 uppercase tracking-wider mb-2 px-1">
          🌡️ Temperature · °C
        </h3>
        <div style={CHART_STYLE}>
          <ResponsiveContainer width="100%" height={148}>
            <AreaChart data={visibleData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.55} />
                  <stop offset="55%" stopColor="#f59e0b" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" stroke={AXIS_COLOR} fontSize={10} tickFormatter={v => `${v}s`} tickLine={false} axisLine={false} />
              <YAxis stroke={AXIS_COLOR} fontSize={10} domain={[0, 115]} tickFormatter={v => `${v}°`} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip unit="°C" formatter={v => `${v.toFixed(1)}°C`} />} />
              {brewStart !== null && (
                <ReferenceLine x={brewStart} stroke="rgba(245,158,11,0.55)" label={{ value: 'brew', fill: '#f59e0b88', fontSize: 9, position: 'insideTopRight' }} {...refLineProps} />
              )}
              {doneStart !== null && (
                <ReferenceLine x={doneStart} stroke="rgba(74,222,128,0.55)" label={{ value: 'done', fill: '#4ade8088', fontSize: 9, position: 'insideTopRight' }} {...refLineProps} />
              )}
              <Area type="monotone" dataKey="waterTemp" stroke="#f59e0b" strokeWidth={2.5} fill="url(#tempGrad)" dot={false} activeDot={{ r: 4, fill: '#f59e0b', stroke: '#1e1408', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pressure Chart */}
      <div>
        <h3 className="text-xs font-semibold text-coffee-400 uppercase tracking-wider mb-2 px-1">
          💨 Pressure · bar
        </h3>
        <div style={CHART_STYLE}>
          <ResponsiveContainer width="100%" height={148}>
            <AreaChart data={visibleData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.55} />
                  <stop offset="55%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" stroke={AXIS_COLOR} fontSize={10} tickFormatter={v => `${v}s`} tickLine={false} axisLine={false} />
              <YAxis stroke={AXIS_COLOR} fontSize={10} domain={[0, 'auto']} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip unit=" bar" formatter={v => `${v.toFixed(3)} bar`} />} />
              {brewStart !== null && (
                <ReferenceLine x={brewStart} stroke="rgba(245,158,11,0.55)" {...refLineProps} />
              )}
              {doneStart !== null && (
                <ReferenceLine x={doneStart} stroke="rgba(74,222,128,0.55)" {...refLineProps} />
              )}
              <Area type="monotone" dataKey="pressure" stroke="#818cf8" strokeWidth={2.5} fill="url(#pressGrad)" dot={false} activeDot={{ r: 4, fill: '#818cf8', stroke: '#1e1408', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Extraction Chart */}
      <div>
        <h3 className="text-xs font-semibold text-coffee-400 uppercase tracking-wider mb-2 px-1">
          ☕ Extraction · %
        </h3>
        <div style={CHART_STYLE}>
          <ResponsiveContainer width="100%" height={148}>
            <AreaChart data={visibleData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="extractGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.6} />
                  <stop offset="55%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" stroke={AXIS_COLOR} fontSize={10} tickFormatter={v => `${v}s`} tickLine={false} axisLine={false} />
              <YAxis stroke={AXIS_COLOR} fontSize={10} domain={[0, 100]} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip unit="%" formatter={v => `${v.toFixed(1)}%`} />} />
              {brewStart !== null && (
                <ReferenceLine x={brewStart} stroke="rgba(245,158,11,0.55)" {...refLineProps} />
              )}
              {doneStart !== null && (
                <ReferenceLine x={doneStart} stroke="rgba(74,222,128,0.55)" {...refLineProps} />
              )}
              <Area type="monotone" dataKey="extractionPct" stroke="#34d399" strokeWidth={2.5} fill="url(#extractGrad)" dot={false} activeDot={{ r: 4, fill: '#34d399', stroke: '#1e1408', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
