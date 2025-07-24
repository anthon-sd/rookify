import React from 'react';

interface MoveAccuracyData {
  moveNumber: number;
  accuracy: number;
  type: string;
}

interface MoveAccuracyChartProps {
  data: MoveAccuracyData[];
  width?: number;
  height?: number;
}

export const MoveAccuracyChart: React.FC<MoveAccuracyChartProps> = ({ 
  data, 
  width = 600, 
  height = 200 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <p>No move accuracy data available</p>
        </div>
      </div>
    );
  }

  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  const barWidth = Math.max(2, innerWidth / data.length - 2);

  // Color mapping for move types
  const getColor = (type: string) => {
    switch (type) {
      case 'Brilliant': return '#06b6d4';
      case 'Best': return '#166534';
      case 'Great': return '#22c55e';
      case 'Balanced': return '#84d3a0';
      case 'Book': return '#b45309';
      case 'Forced': return '#6b7280';
      case 'Inaccuracy': return '#eab308';
      case 'Mistake': return '#f97316';
      case 'Blunder': return '#dc2626';
      case 'Checkmate': return '#000000';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <svg width={width} height={height} className="overflow-visible">
          {/* Chart area */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((value) => {
              const y = innerHeight - (value / 100) * innerHeight;
              return (
                <g key={value}>
                  <line
                    x1={0}
                    y1={y}
                    x2={innerWidth}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeOpacity={0.5}
                    strokeDasharray="2,2"
                  />
                  <text
                    x={-8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-gray-500"
                  >
                    {value}%
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((d, i) => {
              const barHeight = (d.accuracy / 100) * innerHeight;
              const x = i * (innerWidth / data.length) + (innerWidth / data.length - barWidth) / 2;
              const y = innerHeight - barHeight;

              return (
                <g key={i}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={getColor(d.type)}
                    rx={1}
                  />
                  
                  {/* Move number label */}
                  {i % 5 === 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={innerHeight + 15}
                      textAnchor="middle"
                      className="text-xs fill-gray-500"
                    >
                      {Math.floor(d.moveNumber / 2) + 1}
                    </text>
                  )}

                  {/* Tooltip on hover */}
                  <rect
                    x={x}
                    y={0}
                    width={barWidth}
                    height={innerHeight}
                    fill="transparent"
                    className="hover:fill-gray-200 hover:fill-opacity-20"
                  >
                    <title>
                      Move {Math.floor(d.moveNumber / 2) + 1}{d.moveNumber % 2 === 0 ? 'w' : 'b'}: {d.accuracy}% ({d.type})
                    </title>
                  </rect>
                </g>
              );
            })}

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
          </g>

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            Move Number
          </text>
          
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-xs fill-gray-600"
          >
            Accuracy (%)
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { type: 'Brilliant', color: '#06b6d4' },
          { type: 'Best', color: '#166534' },
          { type: 'Great', color: '#22c55e' },
          { type: 'Inaccuracy', color: '#eab308' },
          { type: 'Mistake', color: '#f97316' },
          { type: 'Blunder', color: '#dc2626' }
        ].map(({ type, color }) => (
          <div key={type} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: color }}
            />
            <span>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}; 