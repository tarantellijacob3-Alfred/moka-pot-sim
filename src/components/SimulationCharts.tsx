import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import type { SimulationPoint } from '../physics'

interface Props {
  data: SimulationPoint[]
  currentTime: number
}

export default function SimulationCharts({ data, currentTime }: Props) {
  // Only show data up to current time for animation effect
  const visibleData = data.filter(p => p.time <= currentTime)

  return (
    <div className="space-y-6">
      {/* Temperature Chart */}
      <div>
        <h3 className="text-sm font-bold text-coffee-300 mb-2">🌡️ Temperature (°C)</h3>
        <div className="bg-coffee-900/50 rounded-xl p-3 border border-coffee-700/30">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={visibleData}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d2810" />
              <XAxis
                dataKey="time"
                stroke="#7d5220"
                fontSize={11}
                tickFormatter={v => `${v}s`}
              />
              <YAxis
                stroke="#7d5220"
                fontSize={11}
                domain={[0, 110]}
                tickFormatter={v => `${v}°`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e1408',
                  border: '1px solid #5c3c18',
                  borderRadius: '8px',
                  color: '#f5e6cc',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}°C`, 'Temperature']}
                labelFormatter={v => `Time: ${v}s`}
              />
              <Area
                type="monotone"
                dataKey="waterTemp"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#tempGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pressure Chart */}
      <div>
        <h3 className="text-sm font-bold text-coffee-300 mb-2">💨 Pressure (bar)</h3>
        <div className="bg-coffee-900/50 rounded-xl p-3 border border-coffee-700/30">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={visibleData}>
              <defs>
                <linearGradient id="pressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d2810" />
              <XAxis
                dataKey="time"
                stroke="#7d5220"
                fontSize={11}
                tickFormatter={v => `${v}s`}
              />
              <YAxis
                stroke="#7d5220"
                fontSize={11}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e1408',
                  border: '1px solid #5c3c18',
                  borderRadius: '8px',
                  color: '#f5e6cc',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(3)} bar`, 'Pressure']}
                labelFormatter={v => `Time: ${v}s`}
              />
              <Area
                type="monotone"
                dataKey="pressure"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#pressGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Extraction Chart */}
      <div>
        <h3 className="text-sm font-bold text-coffee-300 mb-2">☕ Extraction (%)</h3>
        <div className="bg-coffee-900/50 rounded-xl p-3 border border-coffee-700/30">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={visibleData}>
              <defs>
                <linearGradient id="extractGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d2810" />
              <XAxis
                dataKey="time"
                stroke="#7d5220"
                fontSize={11}
                tickFormatter={v => `${v}s`}
              />
              <YAxis
                stroke="#7d5220"
                fontSize={11}
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e1408',
                  border: '1px solid #5c3c18',
                  borderRadius: '8px',
                  color: '#f5e6cc',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Extraction']}
                labelFormatter={v => `Time: ${v}s`}
              />
              <Area
                type="monotone"
                dataKey="extractionPct"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#extractGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
