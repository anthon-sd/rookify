import React from 'react';

interface MoveData {
  move: string;
  evaluation: number;
  accuracy: string;
  comment?: string;
  moveNumber: number;
}

interface CentipawnEvaluationChartProps {
  moves: MoveData[];
  width?: number;
  height?: number;
}

export const CentipawnEvaluationChart: React.FC<CentipawnEvaluationChartProps> = ({ 
  moves, 
  width = 600, 
  height = 300 
}) => {
  if (!moves || moves.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">📈</div>
          <p>No evaluation data available</p>
          <p className="text-sm mt-2">Game analysis with Stockfish engine required</p>
        </div>
      </div>
    );
  }

  // Filter moves with valid evaluations
  const validMoves = moves.filter(move => 
    move.evaluation !== undefined && 
    move.evaluation !== null && 
    !isNaN(move.evaluation)
  );

  if (validMoves.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">⚠️</div>
          <p>No evaluation data found in moves</p>
          <p className="text-sm mt-2">Ensure game is analyzed with engine evaluations</p>
        </div>
      </div>
    );
  }

  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  // Clamp extreme evaluations and normalize
  const processedMoves = validMoves.map(move => ({
    ...move,
    clampedEval: Math.max(-800, Math.min(800, move.evaluation))
  }));

  const minEval = Math.min(...processedMoves.map(m => m.clampedEval));
  const maxEval = Math.max(...processedMoves.map(m => m.clampedEval));
  const evalRange = Math.max(200, maxEval - minEval);
  
  // Calculate center line (where evaluation = 0)
  const centerY = innerHeight - ((0 - minEval) / evalRange) * innerHeight;

  // Generate path points
  const pathPoints = processedMoves.map((move, index) => {
    const x = (index / Math.max(processedMoves.length - 1, 1)) * innerWidth;
    const normalizedEval = (move.clampedEval - minEval) / evalRange;
    const y = innerHeight - (normalizedEval * innerHeight);
    return { x, y, move };
  });

  // Create SVG path string
  const createPath = (points: typeof pathPoints) => {
    if (points.length === 0) return '';
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');
    return pathData;
  };

  // Create area paths for positive and negative evaluations
  const createPositiveArea = () => {
    const positivePoints = pathPoints.filter(p => p.y <= centerY);
    if (positivePoints.length === 0) return '';
    
    let path = `M 0 ${centerY}`;
    pathPoints.forEach(point => {
      path += ` L ${point.x} ${Math.min(centerY, point.y)}`;
    });
    path += ` L ${innerWidth} ${centerY} Z`;
    return path;
  };

  const createNegativeArea = () => {
    const negativePoints = pathPoints.filter(p => p.y >= centerY);
    if (negativePoints.length === 0) return '';
    
    let path = `M 0 ${centerY}`;
    pathPoints.forEach(point => {
      path += ` L ${point.x} ${Math.max(centerY, point.y)}`;
    });
    path += ` L ${innerWidth} ${centerY} Z`;
    return path;
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            {/* Gradients for white and black advantage */}
            <linearGradient id="whiteAdvantage" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="blackAdvantage" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {[-800, -400, 0, 400, 800].map((value) => {
              if (value < minEval || value > maxEval) return null;
              const y = innerHeight - ((value - minEval) / evalRange) * innerHeight;
              return (
                <g key={value}>
                  <line
                    x1={0}
                    y1={y}
                    x2={innerWidth}
                    y2={y}
                    stroke={value === 0 ? "#374151" : "#e5e7eb"}
                    strokeOpacity={value === 0 ? 0.8 : 0.3}
                    strokeWidth={value === 0 ? 2 : 1}
                    strokeDasharray={value === 0 ? "none" : "2,2"}
                  />
                  <text
                    x={-8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-gray-500"
                  >
                    {value > 0 ? `+${value/100}` : value/100}
                  </text>
                </g>
              );
            })}

            {/* White advantage area */}
            <path
              d={createPositiveArea()}
              fill="url(#whiteAdvantage)"
            />

            {/* Black advantage area */}
            <path
              d={createNegativeArea()}
              fill="url(#blackAdvantage)"
            />

            {/* Main evaluation line */}
            <path
              d={createPath(pathPoints)}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="none"
            />

            {/* Data points */}
            {pathPoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={3}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth={1}
                className="hover:r-4 transition-all"
              >
                <title>
                  Move {Math.floor(point.move.moveNumber / 2) + 1}: {point.move.move} 
                  ({point.move.clampedEval > 0 ? '+' : ''}{(point.move.clampedEval / 100).toFixed(1)})
                </title>
              </circle>
            ))}

            {/* X-axis */}
            <line
              x1={0}
              y1={innerHeight}
              x2={innerWidth}
              y2={innerHeight}
              stroke="#374151"
              strokeWidth={1}
            />

            {/* Y-axis */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={innerHeight}
              stroke="#374151"
              strokeWidth={1}
            />

            {/* Move number labels on x-axis */}
            {pathPoints.filter((_, i) => i % Math.max(1, Math.floor(pathPoints.length / 8)) === 0).map((point, index) => (
              <text
                key={index}
                x={point.x}
                y={innerHeight + 20}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {Math.floor(point.move.moveNumber / 2) + 1}
              </text>
            ))}
          </g>

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-xs fill-gray-600 font-medium"
          >
            Move Number
          </text>
          
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-xs fill-gray-600 font-medium"
          >
            Evaluation (pawns)
          </text>

          {/* Advantage indicators */}
          <text
            x={margin.left + 10}
            y={25}
            className="text-xs fill-green-600 font-medium"
          >
            White Advantage
          </text>
          
          <text
            x={margin.left + 10}
            y={height - 25}
            className="text-xs fill-red-600 font-medium"
          >
            Black Advantage
          </text>
        </svg>
      </div>

      {/* Info panel */}
      <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Evaluation Range:</strong> {(minEval/100).toFixed(1)} to {(maxEval/100).toFixed(1)} pawns
          </div>
          <div>
            <strong>Total Moves:</strong> {processedMoves.length} analyzed
          </div>
        </div>
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Powered by Stockfish Engine
          </span>
        </div>
      </div>
    </div>
  );
}; 