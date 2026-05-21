import React from 'react'

export function LineChart({ data, height = 220, accentColor = "var(--accent)", showGrid = true, formatY, formatX }) {
  if (!data || data.length === 0) return null
  const W = 800, H = height, PADL = 64, PADR = 20, PADT = 16, PADB = 28
  const ys = data.map(d => d.y)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const yRange = maxY - minY || 1
  const yMin = minY - yRange * 0.1, yMax = maxY + yRange * 0.1
  const xScale = i => PADL + (i / (data.length - 1 || 1)) * (W - PADL - PADR)
  const yScale = v => PADT + (1 - (v - yMin) / (yMax - yMin)) * (H - PADT - PADB)
  const path = data.map((d, i) => `${i ? "L" : "M"} ${xScale(i).toFixed(1)} ${yScale(d.y).toFixed(1)}`).join(" ")
  const areaPath = path + ` L ${xScale(data.length - 1).toFixed(1)} ${H - PADB} L ${PADL} ${H - PADB} Z`
  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (i / yTicks) * (yMax - yMin))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGrid && ticks.map((t, i) => (
        <g key={i}>
          <line x1={PADL} x2={W - PADR} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeDasharray={i === 0 ? "" : "2 3"} />
          <text x={PADL - 8} y={yScale(t) + 4} fill="var(--text-3)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">{formatY ? formatY(t) : Math.round(t)}</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#lineGrad)" />
      <path d={path} stroke={accentColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.y)} r="2.5" fill="var(--panel)" stroke={accentColor} strokeWidth="1.5" />
      ))}
      {data.map((d, i) => {
        if (data.length > 8 && i % Math.ceil(data.length / 8) !== 0 && i !== data.length - 1) return null
        return <text key={i} x={xScale(i)} y={H - 10} fill="var(--text-3)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">{formatX ? formatX(d.x, i) : d.x}</text>
      })}
    </svg>
  )
}

export function BarChart({ data, height = 220, accentColor = "var(--accent)", formatY, formatX, valueLabels = false }) {
  if (!data || data.length === 0) return null
  const W = 800, H = height, PADL = 64, PADR = 20, PADT = 20, PADB = 28
  const ys = data.map(d => d.y)
  const maxY = Math.max(...ys) * 1.1 || 1
  const xStep = (W - PADL - PADR) / data.length
  const barW = Math.min(xStep * 0.65, 36)
  const yScale = v => PADT + (1 - v / maxY) * (H - PADT - PADB)
  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (i / yTicks) * maxY)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PADL} x2={W - PADR} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeDasharray={i === 0 ? "" : "2 3"} />
          <text x={PADL - 8} y={yScale(t) + 4} fill="var(--text-3)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">{formatY ? formatY(t) : Math.round(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = PADL + xStep * i + (xStep - barW) / 2
        const y = yScale(d.y)
        const h = (H - PADB) - y
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="3" fill={d.highlight ? accentColor : "var(--border-strong)"} opacity={d.highlight ? 1 : 0.7} />
            {valueLabels && <text x={x + barW / 2} y={y - 5} fill="var(--text-2)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">{formatY ? formatY(d.y) : d.y}</text>}
            <text x={x + barW / 2} y={H - 10} fill="var(--text-3)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">{formatX ? formatX(d.x, i) : d.x}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function Sparkline({ values, color = "var(--accent)", height = 36 }) {
  if (!values || values.length < 2) return null
  const W = 120, H = height, PAD = 4
  const minV = Math.min(...values), maxV = Math.max(...values)
  const range = maxV - minV || 1
  const x = i => PAD + (i / (values.length - 1)) * (W - PAD * 2)
  const y = v => PAD + (1 - (v - minV) / range) * (H - PAD * 2)
  const path = values.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Donut({ data, size = 160, thickness = 24, accentColors }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = size / 2 - thickness / 2
  const C = 2 * Math.PI * r
  let acc = 0
  const colors = accentColors || ["oklch(0.55 0.12 264)", "oklch(0.6 0.11 200)", "oklch(0.65 0.11 100)", "oklch(0.6 0.13 30)", "oklch(0.55 0.08 320)", "oklch(0.7 0.09 180)"]
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const frac = d.value / total
        const dash = frac * C
        const offset = -acc * C
        acc += frac
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={d.color || colors[i % colors.length]}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt"
          />
        )
      })}
    </svg>
  )
}
