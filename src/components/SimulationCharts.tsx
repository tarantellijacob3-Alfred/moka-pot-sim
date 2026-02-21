import { useMemo } from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ReferenceLine, Legend
} from 'recharts'
import type { SimulationPoint } from '../physics'

interface Props {
  data: SimulationPoint[]
  currentTime: number
  maxTime: number
}

interface TooltipPayloadItem {
  value: number
  name: string
  color: string
  dataKey: string
}

interface UnifiedTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: number
}

function UnifiedTooltip({ active, payload, label }: UnifiedTooltipProps) {
  if (!active || !payload?.length) return null

  const temp = payload.find(p => p.dataKey === 'waterTemp')
  const pressure = payload.find(p => p.dataKey === 'pressure')
  const extraction = payload.find(p => p.dataKey === 'extractionScaled')

  // extractionScaled = extractionPct * 1.15, so reverse to get real %
  const realExtraction = extraction ? extraction.value / 1.15 : null

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(12,8,2,0.97), rgba(28,16,6,0.96))',
        border: '1px solid rgba(212,165,100,0.25)',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,165,100,0.08)',
        fontSize: '12px',
        color: '#f5e6cc',
        minWidth: '140px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ color: 'rgba(166,120,60,0.8)', marginBottom: 6, fontSize: 11, letterSpacing: '0.04em' }}>
        ⏱ {label}s
      </div>
      {temp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, boxShadow: '0 0 6px #f59e0b88' }} />
          <span style={{ color: 'rgba(200,165,110,0.75)', fontSize: 10, width: 66 }}>Temperature</span>
          <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>{temp.value.toFixed(1)}°C</span>
        </div>
      )}
      {pressure && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', flexShrink: 0, boxShadow: '0 0 6px #818cf888' }} />
          <span style={{ color: 'rgba(200,165,110,0.75)', fontSize: 10, width: 66 }}>Pressure</span>
          <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 13 }}>{pressure.value.toFixed(3)} bar</span>
        </div>
      )}
      {extraction && realExtraction !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0, boxShadow: '0 0 6px #34d39988' }} />
          <span style={{ color: 'rgba(200,165,110,0.75)', fontSize: 10, width: 66 }}>Extraction</span>
          <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: 13 }}>{realExtraction.toFixed(1)}%</span>
        </div>
      )}
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
  padding: '10px 2px 4px',
}

const GRID_COLOR = 'rgba(61,40,16,0.6)'
const AXIS_COLOR = '#5c3c18'

// Custom legend items (we render our own above the chart)
const LEGEND_ITEMS = [
  { color: '#f59e0b', glow: '#f59e0b88', label: 'Temp °C', key: 'temp' },
  { color: '#818cf8', glow: '#818cf888', label: 'Pressure', key: 'pressure' },
  { color: '#34d399', glow: '#34d39988', label: 'Extraction', key: 'extraction' },
]

interface LegendPayload {
  value: string
  color: string
}

function ChartLegend(_props: { payload?: LegendPayload[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid rgba(92,60,24,0.2)' }}>
      {LEGEND_ITEMS.map(item => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(200,165,110,0.8)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, display: 'inline-block', boxShadow: `0 0 6px ${item.glow}` }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

export default function SimulationCharts({ data, currentTime, maxTime }: Props) {
  // Round to nearest second — data points are 1s apart, no need for sub-second updates
  const roundedTime = Math.round(currentTime)

  // Memoize visible data so Recharts only re-renders when we have a new data point
  const visibleData = useMemo(() =>
    data
      .filter(p => p.time <= roundedTime)
      .map(p => ({
        ...p,
        extractionScaled: p.extractionPct * 1.15,
      })),
    [data, roundedTime]
  )

  const { brewStart, doneStart } = useMemo(() => getPhaseTransitions(data), [data])
  // Pre-compute fixed pressure domain from full data so Y-axis doesn't jump
  const pressureCeil = useMemo(() => {
    const mp = Math.max(...data.map(p => p.pressure), 0.5)
    return Math.ceil(mp * 2) / 2
  }, [data])

  const refLineProps = {
    strokeDasharray: '4 3' as const,
    strokeWidth: 1.5,
    ifOverflow: 'visible' as const,
  }

  return (
    <div style={CHART_STYLE}>
      <ResponsiveContainer width="100%" height={280} minWidth={0}>
        <AreaChart data={visibleData} margin={{ top: 8, right: 30, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
              <stop offset="55%" stopColor="#f59e0b" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45} />
              <stop offset="55%" stopColor="#3b82f6" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="extractGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
              <stop offset="55%" stopColor="#22c55e" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />

          {/* Shared X axis — fixed domain so lines don't shift during animation */}
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, maxTime]}
            stroke={AXIS_COLOR}
            fontSize={10}
            tickFormatter={v => `${v}s`}
            tickLine={false}
            axisLine={false}
          />

          {/* Left Y axis: Temperature (0-115°C) and Extraction (scaled 0-115) */}
          <YAxis
            yAxisId="left"
            stroke={AXIS_COLOR}
            fontSize={10}
            domain={[0, 115]}
            tickFormatter={v => `${v}°`}
            tickLine={false}
            axisLine={false}
          />

          {/* Right Y axis: Pressure (auto-scaled) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#4a5568"
            fontSize={9}
            domain={[0, pressureCeil]}
            tickFormatter={v => `${v}b`}
            tickLine={false}
            axisLine={false}
            width={30}
          />

          {/* Custom legend rendered at top */}
          <Legend
            verticalAlign="top"
            content={<ChartLegend />}
          />

          <Tooltip content={<UnifiedTooltip />} />

          {/* Phase markers */}
          {brewStart !== null && (
            <ReferenceLine
              yAxisId="left"
              x={brewStart}
              stroke="rgba(245,158,11,0.6)"
              label={{ value: 'brew', fill: '#f59e0baa', fontSize: 9, position: 'insideTopRight' }}
              {...refLineProps}
            />
          )}
          {doneStart !== null && (
            <ReferenceLine
              yAxisId="left"
              x={doneStart}
              stroke="rgba(74,222,128,0.6)"
              label={{ value: 'done', fill: '#4ade80aa', fontSize: 9, position: 'insideTopRight' }}
              {...refLineProps}
            />
          )}

          {/* Current time cursor */}
          <ReferenceLine
            yAxisId="left"
            x={currentTime}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
            ifOverflow="visible"
          />

          {/* Temperature area (left axis) */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="waterTemp"
            name="Temperature"
            stroke="#f59e0b"
            strokeWidth={2.5}
            fill="url(#tempGrad)"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 4, fill: '#f59e0b', stroke: '#1e1408', strokeWidth: 2 }}
          />

          {/* Extraction area (left axis, scaled) */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="extractionScaled"
            name="Extraction"
            stroke="#34d399"
            strokeWidth={2.5}
            fill="url(#extractGrad)"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 4, fill: '#34d399', stroke: '#1e1408', strokeWidth: 2 }}
          />

          {/* Pressure area (right axis) */}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="pressure"
            name="Pressure"
            stroke="#818cf8"
            strokeWidth={2.5}
            fill="url(#pressGrad)"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 4, fill: '#818cf8', stroke: '#1e1408', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
