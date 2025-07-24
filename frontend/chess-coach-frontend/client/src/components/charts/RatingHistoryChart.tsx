import React, { useState } from 'react';

interface RatingDataPoint {
  date: string;
  rating: number;
}

interface RatingHistoryChartProps {
  data: RatingDataPoint[];
  width?: number;
  height?: number;
}

export const RatingHistoryChart: React.FC<RatingHistoryChartProps> = ({ 
  data, 
  width = 600, 
  height = 300 
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<RatingDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">📈</div>
          <p>No rating history available</p>
        </div>
      </div>
    );
  }

  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  // Data processing
  const ratings = data.map(d => d.rating);
  const minRating = Math.min(...ratings) - 50;
  const maxRating = Math.max(...ratings) + 50;
  const ratingRange = maxRating - minRating;

  const dates = data.map(d => new Date(d.date));
  const minDate = Math.min(...dates.map(d => d.getTime()));
  const maxDate = Math.max(...dates.map(d => d.getTime()));
  const dateRange = maxDate - minDate;

  // Scale functions
  const scaleX = (date: string) => {
    const dateTime = new Date(date).getTime();
    return ((dateTime - minDate) / dateRange) * innerWidth;
  };

  const scaleY = (rating: number) => {
    return innerHeight - ((rating - minRating) / ratingRange) * innerHeight;
  };

  // Create path for the line
  const createPath = () => {
    return data.map((point, index) => {
      const x = scaleX(point.date);
      const y = scaleY(point.rating);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Create area path (filled area under the line)
  const createAreaPath = () => {
    if (data.length === 0) return '';
    
    let path = `M 0 ${innerHeight}`;
    data.forEach(point => {
      const x = scaleX(point.date);
      const y = scaleY(point.rating);
      path += ` L ${x} ${y}`;
    });
    path += ` L ${innerWidth} ${innerHeight} Z`;
    return path;
  };

  // Y-axis ticks
  const yTicks = [];
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    const rating = minRating + (ratingRange * i) / tickCount;
    yTicks.push(Math.round(rating));
  }

  // X-axis ticks (dates)
  const xTicks = [];
  const xTickCount = Math.min(5, data.length);
  for (let i = 0; i < xTickCount; i++) {
    const index = Math.floor((data.length - 1) * i / (xTickCount - 1));
    xTicks.push(data[index]);
  }

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - margin.left;
    const y = event.clientY - rect.top - margin.top;
    
    // Find closest data point
    let closestPoint = data[0];
    let minDistance = Infinity;
    
    data.forEach(point => {
      const pointX = scaleX(point.date);
      const pointY = scaleY(point.rating);
      const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    if (minDistance < 30) { // Only show tooltip if within 30px
      setHoveredPoint(closestPoint);
      setMousePosition({ x: event.clientX, y: event.clientY });
    } else {
      setHoveredPoint(null);
    }
  };

  return (
    <div className="relative">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            {/* Gradient for the area */}
            <linearGradient id="ratingAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
            
            {/* Gradient for the line */}
            <linearGradient id="ratingLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {yTicks.map((rating) => {
              const y = scaleY(rating);
              return (
                <line
                  key={rating}
                  x1={0}
                  y1={y}
                  x2={innerWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeOpacity={0.5}
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Area under the curve */}
            <path
              d={createAreaPath()}
              fill="url(#ratingAreaGradient)"
            />

            {/* Main line */}
            <path
              d={createPath()}
              stroke="url(#ratingLineGradient)"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {data.map((point, index) => (
              <circle
                key={index}
                cx={scaleX(point.date)}
                cy={scaleY(point.rating)}
                r={hoveredPoint === point ? 6 : 4}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={2}
                className="transition-all duration-200"
              />
            ))}

            {/* Y-axis */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={innerHeight}
              stroke="#374151"
              strokeWidth={1}
            />

            {/* X-axis */}
            <line
              x1={0}
              y1={innerHeight}
              x2={innerWidth}
              y2={innerHeight}
              stroke="#374151"
              strokeWidth={1}
            />

            {/* Y-axis labels */}
            {yTicks.map((rating) => (
              <text
                key={rating}
                x={-10}
                y={scaleY(rating)}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {rating}
              </text>
            ))}

            {/* X-axis labels */}
            {xTicks.map((point, index) => (
              <text
                key={index}
                x={scaleX(point.date)}
                y={innerHeight + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            ))}

            {/* Invisible overlay for mouse interaction */}
            <rect
              x={0}
              y={0}
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: 'crosshair' }}
            />
          </g>

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-sm fill-gray-600 dark:fill-gray-400 font-medium"
          >
            Date
          </text>

          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-sm fill-gray-600 dark:fill-gray-400 font-medium"
          >
            Rating
          </text>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2 text-sm pointer-events-none z-50"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold text-blue-600">{hoveredPoint.rating} Rating</div>
          <div className="text-gray-500 dark:text-gray-400">
            {new Date(hoveredPoint.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
      )}
    </div>
  );
}; 