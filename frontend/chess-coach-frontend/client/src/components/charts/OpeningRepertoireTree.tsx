import React, { useState } from 'react';

interface OpeningMove {
  move: string;
  count: number;
  winRate: number;
  children?: OpeningMove[];
}

interface OpeningRepertoireTreeProps {
  openingData: OpeningMove[];
  width?: number;
  height?: number;
}

export const OpeningRepertoireTree: React.FC<OpeningRepertoireTreeProps> = ({ 
  openingData, 
  width = 800, 
  height = 600 
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  if (!openingData || openingData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">🌳</div>
          <p>No opening repertoire data available</p>
          <p className="text-sm mt-2">Play more games to build your opening tree</p>
        </div>
      </div>
    );
  }

  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;

  // Calculate tree layout
  const calculateLayout = (nodes: OpeningMove[], level = 0, parentX = innerWidth / 2, parentY = 50): any[] => {
    const nodeHeight = 80;
    const levelSpacing = 120;
    const nodeSpacing = Math.max(120, innerWidth / Math.max(nodes.length, 1));

    return nodes.flatMap((node, index) => {
      const nodeId = `${level}-${index}-${node.move}`;
      const x = parentX + (index - (nodes.length - 1) / 2) * nodeSpacing / (level + 1);
      const y = parentY + level * levelSpacing;

      const currentNode = {
        id: nodeId,
        move: node.move,
        count: node.count,
        winRate: node.winRate,
        x,
        y,
        level,
        parentX,
        parentY: level > 0 ? parentY : null,
        hasChildren: node.children && node.children.length > 0,
        isExpanded: expandedNodes.has(nodeId)
      };

      const childNodes = node.children && expandedNodes.has(nodeId) 
        ? calculateLayout(node.children, level + 1, x, y + nodeHeight)
        : [];

      return [currentNode, ...childNodes];
    });
  };

  const layoutNodes = calculateLayout(openingData);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Get color based on win rate
  const getNodeColor = (winRate: number, isHovered: boolean) => {
    const alpha = isHovered ? 0.8 : 0.6;
    if (winRate >= 60) return `rgba(34, 197, 94, ${alpha})`; // Green for good win rate
    if (winRate >= 45) return `rgba(234, 179, 8, ${alpha})`; // Yellow for average
    return `rgba(239, 68, 68, ${alpha})`; // Red for poor win rate
  };

  // Get text color for readability
  const getTextColor = (winRate: number) => {
    if (winRate >= 60) return '#ffffff';
    if (winRate >= 45) return '#000000';
    return '#ffffff';
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg border overflow-auto">
        <svg width={width} height={Math.max(height, layoutNodes.length * 50)} className="overflow-visible">
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Connection lines */}
            {layoutNodes
              .filter(node => node.parentX !== null && node.parentY !== null)
              .map(node => (
                <line
                  key={`line-${node.id}`}
                  x1={node.parentX}
                  y1={node.parentY + 30}
                  x2={node.x}
                  y2={node.y - 30}
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  className="opacity-60"
                />
              ))}

            {/* Nodes */}
            {layoutNodes.map(node => (
              <g key={node.id}>
                {/* Node background */}
                <rect
                  x={node.x - 50}
                  y={node.y - 30}
                  width={100}
                  height={60}
                  fill={getNodeColor(node.winRate, hoveredNode === node.id)}
                  stroke={hoveredNode === node.id ? '#3b82f6' : '#e2e8f0'}
                  strokeWidth={hoveredNode === node.id ? 2 : 1}
                  rx={8}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => node.hasChildren && toggleNode(node.id)}
                />

                {/* Move notation */}
                <text
                  x={node.x}
                  y={node.y - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm font-bold pointer-events-none"
                  fill={getTextColor(node.winRate)}
                >
                  {node.move}
                </text>

                {/* Statistics */}
                <text
                  x={node.x}
                  y={node.y + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs pointer-events-none"
                  fill={getTextColor(node.winRate)}
                >
                  {node.count} games • {node.winRate}%
                </text>

                {/* Expansion indicator */}
                {node.hasChildren && (
                  <circle
                    cx={node.x + 35}
                    cy={node.y - 20}
                    r={8}
                    fill={node.isExpanded ? '#ef4444' : '#22c55e'}
                    className="cursor-pointer"
                    onClick={() => toggleNode(node.id)}
                  />
                )}

                {/* Expansion symbol */}
                {node.hasChildren && (
                  <text
                    x={node.x + 35}
                    y={node.y - 20}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-bold fill-white pointer-events-none"
                  >
                    {node.isExpanded ? '−' : '+'}
                  </text>
                )}
              </g>
            ))}
          </g>

          {/* Title */}
          <text
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="text-lg font-semibold fill-gray-800 dark:fill-gray-200"
          >
            Opening Repertoire Tree
          </text>
        </svg>
      </div>

      {/* Legend and controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Legend */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium mb-3">Win Rate Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }}></div>
              <span className="text-sm">Strong (≥60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(234, 179, 8, 0.6)' }}></div>
              <span className="text-sm">Average (45-59%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }}></div>
              <span className="text-sm">Weak (&lt;45%)</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium mb-3">Controls</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">+</div>
              <span>Click to expand variations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">−</div>
              <span>Click to collapse variations</span>
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Hover nodes for detailed statistics
            </div>
          </div>
        </div>
      </div>

      {/* Statistics summary */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div>
          <div className="text-2xl font-bold text-blue-600">
            {layoutNodes.filter(n => n.level === 0).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Main Openings</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {layoutNodes.reduce((acc, n) => acc + n.count, 0)}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Total Games</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(layoutNodes.reduce((acc, n) => acc + n.winRate * n.count, 0) / 
                       layoutNodes.reduce((acc, n) => acc + n.count, 0))}%
          </div>
          <div className="text-gray-600 dark:text-gray-400">Overall Win Rate</div>
        </div>
      </div>

      {/* Tooltip for hovered node */}
      {hoveredNode && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border-l-4 border-blue-500">
          {(() => {
            const node = layoutNodes.find(n => n.id === hoveredNode);
            if (!node) return null;
            return (
              <div>
                <div className="font-medium">Move: {node.move}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Played {node.count} times with {node.winRate}% win rate
                  {node.hasChildren && (
                    <span className="ml-2">
                      • {node.isExpanded ? 'Showing' : 'Hiding'} variations
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}; 