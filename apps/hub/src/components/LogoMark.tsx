const BW = 4
const GAP = 1
const STEP = BW + GAP  // 5
const VW = 9 * STEP - GAP   // 44
const VH = 15 * STEP - GAP  // 74

const isFilled = (r: number, c: number): boolean => {
  if (r <= 2) return true
  if (r <= 5) return c <= 2
  if (r <= 8) return true
  if (r <= 11) return c >= 6
  return true
}

const CELLS: [number, number][] = []
for (let r = 0; r < 15; r++)
  for (let c = 0; c < 9; c++)
    if (isFilled(r, c)) CELLS.push([r, c])

interface Props {
  color?: string
  height?: number
  className?: string
}

export default function LogoMark({ color = '#ffffff', height = 22, className }: Props) {
  const width = Math.round(VW * height / VH)
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VW} ${VH}`}
      aria-hidden="true"
      className={className}
      style={{ transition: 'all 0.3s ease', flexShrink: 0 }}
    >
      {CELLS.map(([r, c]) => (
        <rect
          key={`${r}-${c}`}
          x={c * STEP}
          y={r * STEP}
          width={BW}
          height={BW}
          rx={1}
          fill={color}
        />
      ))}
    </svg>
  )
}
