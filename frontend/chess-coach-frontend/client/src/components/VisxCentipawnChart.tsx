// React import not needed for this component
import { scaleLinear } from '@visx/scale'
import { LinePath, AreaClosed } from '@visx/shape'
import { curveMonotoneX } from '@visx/curve'
import { LinearGradient } from '@visx/gradient'

interface Move {
  moveNumber: number
  evaluation?: number
}

interface VisxCentipawnChartProps {
  moves: Move[]
}

export function VisxCentipawnChart({ moves }: VisxCentipawnChartProps) {
  const width = 400
  const height = 200
  const margin = { top: 20, right: 20, bottom: 20, left: 20 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Process move data
  const chartData = moves.map((move, index) => {
    let evaluation = move.evaluation || 0
    
    // Handle mate evaluations
    if (Math.abs(evaluation) > 5000) {
      evaluation = evaluation > 0 ? 1000 : -1000
    }
    
    // Clamp evaluation between -10 and +10 pawns
    const clampedEval = Math.max(-1000, Math.min(1000, evaluation))
    
    return {
      moveIndex: index,
      evaluation: clampedEval,
      moveNumber: move.moveNumber
    }
  })

  // Create scales
  const xScale = scaleLinear({
    range: [0, innerWidth],
    domain: [0, Math.max(chartData.length - 1, 1)]
  })
  
  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: [-1000, 1000] // -10 to +10 pawns
  })

  // Accessor functions
  const getX = (d: typeof chartData[0]) => xScale(d.moveIndex)
  const getY = (d: typeof chartData[0]) => yScale(d.evaluation)
  const getY0 = () => yScale(0) // Center line for fills

  return (
    <svg width={width} height={height} className="absolute inset-4">
      <defs>
        <LinearGradient
          id="whiteAdvantage"
          from="rgba(34, 197, 94, 0.3)"
          to="rgba(34, 197, 94, 0.1)"
          vertical={true}
        />
        <LinearGradient
          id="blackAdvantage"
          from="rgba(239, 68, 68, 0.1)"
          to="rgba(239, 68, 68, 0.3)"
          vertical={true}
        />
      </defs>
      
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Center line (0 evaluation) */}
        <line
          x1={0}
          y1={yScale(0)}
          x2={innerWidth}
          y2={yScale(0)}
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.3}
          strokeDasharray="4,4"
        />
        
        {/* White advantage area (positive evaluations) */}
        <AreaClosed
          data={chartData}
          x={getX}
          y={getY}
          y0={getY0}
          yScale={yScale}
          curve={curveMonotoneX}
          fill="url(#whiteAdvantage)"
          opacity={0.6}
        />
        
        {/* Black advantage area (negative evaluations) */}
        <AreaClosed
          data={chartData}
          x={getX}
          y={getY0}
          y0={getY}
          yScale={yScale}
          curve={curveMonotoneX}
          fill="url(#blackAdvantage)"
          opacity={0.6}
        />
        
        {/* Evaluation line */}
        <LinePath
          data={chartData}
          x={getX}
          y={getY}
          stroke="#2563eb"
          strokeWidth={2}
          curve={curveMonotoneX}
        />
      </g>
    </svg>
  )
} 