// React import not needed for this component
import { scaleLinear } from '@visx/scale'
import { LinePath, AreaClosed } from '@visx/shape'
import { curveMonotoneX } from '@visx/curve'
import { LinearGradient } from '@visx/gradient'
import { useRef, useEffect, useState } from 'react'

interface Move {
  moveNumber: number
  evaluation?: number
}

interface VisxCentipawnChartProps {
  moves: Move[]
  width?: number
  height?: number
  onMoveClick?: (moveIndex: number) => void
  currentMoveIndex?: number
}

export function VisxCentipawnChart({ moves, width: propWidth, height: propHeight, onMoveClick, currentMoveIndex = -1 }: VisxCentipawnChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: propWidth || 600, height: propHeight || 200 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: propWidth || rect.width || 600,
          height: propHeight || rect.height || 200
        })
      }
    }

    // Update dimensions on mount and resize
    updateDimensions()
    
    const observer = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [propWidth, propHeight])

  const { width, height } = dimensions
  const margin = { top: 20, right: 20, bottom: 20, left: 20 }
  const innerWidth = Math.max(0, width - margin.left - margin.right)
  const innerHeight = Math.max(0, height - margin.top - margin.bottom)

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

  // Create scales - ensure x-axis fills the full width
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

  // Split data into segments based on evaluation sign
  const getSegments = () => {
    const positiveSegments: typeof chartData[] = []
    const negativeSegments: typeof chartData[] = []
    
    let currentPositive: typeof chartData = []
    let currentNegative: typeof chartData = []
    
    for (let i = 0; i < chartData.length; i++) {
      const point = chartData[i]
      const prevPoint = i > 0 ? chartData[i - 1] : null
      
      if (point.evaluation >= 0) {
        // If transitioning from negative to positive, add interpolated zero point
        if (prevPoint && prevPoint.evaluation < 0 && currentNegative.length > 0) {
          const zeroPoint = { ...point, evaluation: 0 }
          currentNegative.push(zeroPoint)
          negativeSegments.push([...currentNegative])
          currentNegative = []
          currentPositive = [zeroPoint]
        }
        currentPositive.push(point)
      } else {
        // If transitioning from positive to negative, add interpolated zero point
        if (prevPoint && prevPoint.evaluation >= 0 && currentPositive.length > 0) {
          const zeroPoint = { ...point, evaluation: 0 }
          currentPositive.push(zeroPoint)
          positiveSegments.push([...currentPositive])
          currentPositive = []
          currentNegative = [zeroPoint]
        }
        currentNegative.push(point)
      }
    }
    
    // Add remaining segments
    if (currentPositive.length > 0) {
      positiveSegments.push(currentPositive)
    }
    if (currentNegative.length > 0) {
      negativeSegments.push(currentNegative)
    }
    
    return { positiveSegments, negativeSegments }
  }

  const { positiveSegments, negativeSegments } = getSegments()

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible" style={{ backgroundColor: 'rgba(204, 204, 204, 0.5)' }}>
        <defs>
          <LinearGradient
            id="whiteAdvantageArea"
            from="rgb(255, 255, 255)"
            to="rgb(255, 255, 255)"
            vertical={true}
          />
          <LinearGradient
            id="blackAdvantageArea"
            from="rgb(0, 0, 0)"
            to="rgb(0, 0, 0)"
            vertical={true}
          />
        </defs>
        
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Center line (0 evaluation) - spans full width */}
          <line
            x1={0}
            y1={yScale(0)}
            x2={innerWidth}
            y2={yScale(0)}
            stroke="#9ca3af"
            strokeWidth={2}
            opacity={0.8}
            strokeDasharray="6,4"
          />
          
          {/* White advantage area (positive evaluations) */}
          {positiveSegments.map((segment, index) => (
            segment.length > 1 && (
              <AreaClosed
                key={`positive-area-${index}`}
                data={segment}
                x={getX}
                y={getY}
                y0={getY0}
                yScale={yScale}
                curve={curveMonotoneX}
                fill="url(#whiteAdvantageArea)"
                opacity={1.0}
                stroke="#e5e5e5"
                strokeWidth={1}
              />
            )
          ))}
          
          {/* Black advantage area (negative evaluations) */}
          {negativeSegments.map((segment, index) => (
            segment.length > 1 && (
              <AreaClosed
                key={`negative-area-${index}`}
                data={segment}
                x={getX}
                y={getY}
                y0={getY0}
                yScale={yScale}
                curve={curveMonotoneX}
                fill="url(#blackAdvantageArea)"
                opacity={1.0}
                stroke="#404040"
                strokeWidth={1}
              />
            )
          ))}
          
          {/* White evaluation line (positive values) */}
          {positiveSegments.map((segment, index) => (
            segment.length > 1 && (
              <LinePath
                key={`positive-line-${index}`}
                data={segment}
                x={getX}
                y={getY}
                stroke="#ffffff"
                strokeWidth={1.5}
                curve={curveMonotoneX}
              />
            )
          ))}
          
          {/* Black evaluation line (negative values) */}
          {negativeSegments.map((segment, index) => (
            segment.length > 1 && (
              <LinePath
                key={`negative-line-${index}`}
                data={segment}
                x={getX}
                y={getY}
                stroke="#000000"
                strokeWidth={1.5}
                curve={curveMonotoneX}
              />
            )
          ))}
          
          {/* Data points and labels */}
          {chartData.map((point, index) => {
            const x = getX(point)
            const y = getY(point)
            const centipawnValue = (point.evaluation / 100).toFixed(1)
            const isPositive = point.evaluation >= 0
            const isCurrent = index === currentMoveIndex
            const isWhiteMove = index % 2 === 0
            const highlightColor = isWhiteMove ? "#000000" : "#ffffff"  // Black for white moves, white for black moves
            
            // Only show labels for every few points to avoid clutter, or significant evaluation changes
            const shouldShowLabel = index % 5 === 0 || 
              (index > 0 && Math.abs(point.evaluation - chartData[index - 1].evaluation) > 200) ||
              index === chartData.length - 1 ||
              isCurrent // Always show label for current move
            
            return (
              <g key={`point-${index}`}>
                {/* Current move highlight ring */}
                {isCurrent && (
                  <circle
                    cx={x}
                    cy={y}
                    r={7}
                    fill="none"
                    stroke={isWhiteMove ? "#ffffff" : "#000000"}
                    strokeWidth={3}
                    opacity={0.8}
                  />
                )}
                
                {/* Data point circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isCurrent ? 4 : 3}
                  fill={isCurrent ? highlightColor : (isPositive ? "#ffffff" : "#000000")}
                  stroke={isCurrent ? (isWhiteMove ? "#ffffff" : "#000000") : (isPositive ? "#666666" : "#ffffff")}
                  strokeWidth={isCurrent ? 2 : 1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onMoveClick?.(index)}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.setAttribute('r', '4')
                      e.currentTarget.style.strokeWidth = '2'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.setAttribute('r', '3')
                      e.currentTarget.style.strokeWidth = '1'
                    }
                  }}
                />
                
                                {/* Labels for selected points */}
                {shouldShowLabel && (
                  <>
                    {/* Centipawn value label */}
                    <text
                      x={x}
                      y={y - (isCurrent ? 12 : 8)}
                      textAnchor="middle"
                      fontSize={isCurrent ? "12" : "10"}
                      fill={isCurrent ? highlightColor : (isPositive ? "#333333" : "#666666")}
                      fontWeight="bold"
                      style={{ 
                        textShadow: isCurrent 
                          ? (isWhiteMove ? '1px 1px 3px rgba(255,255,255,0.8)' : '1px 1px 3px rgba(0,0,0,0.5)')
                          : '1px 1px 2px rgba(255,255,255,0.8)' 
                      }}
                    >
                      {point.evaluation > 0 ? `+${centipawnValue}` : centipawnValue}
                    </text>
                    
                    {/* Move number label */}
                    <text
                      x={x}
                      y={y + (isCurrent ? 20 : 16)}
                      textAnchor="middle"
                      fontSize={isCurrent ? "11" : "9"}
                      fill={isCurrent ? highlightColor : "#555555"}
                      fontWeight={isCurrent ? "bold" : "normal"}
                      style={{ 
                        textShadow: isCurrent 
                          ? (isWhiteMove ? '1px 1px 3px rgba(255,255,255,0.8)' : '1px 1px 3px rgba(0,0,0,0.5)')
                          : '1px 1px 2px rgba(255,255,255,0.8)' 
                      }}
                    >
                      {Math.floor(point.moveNumber)}
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
} 