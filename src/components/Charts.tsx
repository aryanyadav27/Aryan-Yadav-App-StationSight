import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { litres, longDate, money, rate, shortDate } from '../lib/format'

const AXIS = { stroke: '#8798ad', fontSize: 11 }
const GRID = '#e3e9f2'

/** Keep the x-axis readable on a phone: ~5 labels regardless of range length. */
const tickGap = (n: number) => Math.max(0, Math.ceil(n / 5) - 1)

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #dbe3ee',
  borderRadius: 10,
  fontSize: 12,
  padding: '8px 10px',
  color: '#10263c',
  boxShadow: '0 4px 16px rgba(16, 38, 60, 0.12)',
}

function Frame({ children, height = 190 }: { children: React.ReactElement; height?: number }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export function ValueTrend({ data }: { data: { date: string; value: number }[] }) {
  return (
    <Frame>
      <AreaChart data={data} margin={{ top: 5, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#007dc6" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#007dc6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} interval={tickGap(data.length)} tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickFormatter={(v) => money(v)} tickLine={false} axisLine={false} tick={AXIS} width={60} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={longDate}
          formatter={(v: number) => [money(v), 'Sale value']}
        />
        <Area type="monotone" dataKey="value" stroke="#007dc6" strokeWidth={2} fill="url(#gv)" isAnimationActive={false} />
      </AreaChart>
    </Frame>
  )
}

export function LitreTrend({
  data,
  series,
}: {
  data: Record<string, number | string>[]
  series: { key: string; name: string; color: string }[]
}) {
  return (
    <Frame>
      <LineChart data={data} margin={{ top: 5, right: 6, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} interval={tickGap(data.length)} tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickFormatter={(v) => litres(v)} tickLine={false} axisLine={false} tick={AXIS} width={62} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={longDate}
          formatter={(v: number, n: string) => [litres(v), n]}
        />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </Frame>
  )
}

export function RateTrend({ data }: { data: { date: string; msRate: number; hsdRate: number }[] }) {
  return (
    <Frame height={210}>
      <LineChart data={data} margin={{ top: 5, right: 6, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} interval={tickGap(data.length)} tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis
          domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
          tickFormatter={(v) => rate(v)}
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          width={58}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={longDate}
          formatter={(v: number, n: string) => [rate(v), n]}
        />
        <Line type="stepAfter" dataKey="msRate" name="Petrol" stroke="#e08900" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="hsdRate" name="Diesel" stroke="#0f9d76" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </Frame>
  )
}
