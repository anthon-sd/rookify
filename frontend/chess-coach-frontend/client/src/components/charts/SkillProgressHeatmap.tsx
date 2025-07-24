import React from 'react';

interface Skill {
  name: string;
  level: number;
  maxLevel: number;
  isUnlocked: boolean;
}

interface SkillCategory {
  category: string;
  skills: Skill[];
}

interface SkillProgressHeatmapProps {
  skillTree: SkillCategory[];
  width?: number;
  height?: number;
}

export const SkillProgressHeatmap: React.FC<SkillProgressHeatmapProps> = ({ 
  skillTree, 
  width = 800, 
  height = 400 
}) => {
  if (!skillTree || skillTree.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">🎯</div>
          <p>No skill data available</p>
        </div>
      </div>
    );
  }

  const margin = { top: 60, right: 40, bottom: 40, left: 120 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.bottom - margin.top;

  // Prepare data for heatmap
  const allSkills = skillTree.flatMap(category => 
    category.skills.map(skill => ({
      ...skill,
      category: category.category,
      progress: skill.level / skill.maxLevel,
      displayName: skill.name.length > 15 ? skill.name.substring(0, 15) + '...' : skill.name
    }))
  );

  const maxSkillsPerCategory = Math.max(...skillTree.map(cat => cat.skills.length));
  const cellWidth = innerWidth / maxSkillsPerCategory;
  const cellHeight = innerHeight / skillTree.length;

  // Color scale for progress
  const getColor = (progress: number, isUnlocked: boolean) => {
    if (!isUnlocked) return '#f3f4f6'; // Gray for locked skills
    
    const intensity = progress;
    const red = Math.round(255 * (1 - intensity));
    const green = Math.round(255 * intensity);
    return `rgb(${red}, ${green}, 100)`;
  };

  // Get text color based on background
  const getTextColor = (progress: number, isUnlocked: boolean) => {
    if (!isUnlocked) return '#6b7280';
    return progress > 0.5 ? '#ffffff' : '#000000';
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg border p-4">
        <svg width={width} height={height} className="overflow-visible">
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Skill cells */}
            {skillTree.map((category, categoryIndex) => (
              <g key={category.category}>
                {category.skills.map((skill, skillIndex) => {
                  const x = skillIndex * cellWidth;
                  const y = categoryIndex * cellHeight;
                  const progress = skill.level / skill.maxLevel;
                  
                  return (
                    <g key={skill.name}>
                      {/* Cell background */}
                      <rect
                        x={x}
                        y={y}
                        width={cellWidth - 2}
                        height={cellHeight - 2}
                        fill={getColor(progress, skill.isUnlocked)}
                        stroke="#e5e7eb"
                        strokeWidth={1}
                        rx={4}
                        className="hover:stroke-blue-500 hover:stroke-2 transition-all cursor-pointer"
                      >
                        <title>
                          {skill.name}: {skill.level}/{skill.maxLevel} 
                          ({skill.isUnlocked ? 'Unlocked' : 'Locked'})
                        </title>
                      </rect>

                      {/* Progress text */}
                      <text
                        x={x + cellWidth / 2}
                        y={y + cellHeight / 2 - 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium pointer-events-none"
                        fill={getTextColor(progress, skill.isUnlocked)}
                      >
                        {skill.level}/{skill.maxLevel}
                      </text>

                      {/* Percentage */}
                      <text
                        x={x + cellWidth / 2}
                        y={y + cellHeight / 2 + 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs pointer-events-none"
                        fill={getTextColor(progress, skill.isUnlocked)}
                      >
                        {Math.round(progress * 100)}%
                      </text>

                      {/* Lock icon for locked skills */}
                      {!skill.isUnlocked && (
                        <text
                          x={x + cellWidth - 15}
                          y={y + 15}
                          className="text-xs pointer-events-none"
                          fill="#6b7280"
                        >
                          🔒
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}

            {/* Category labels (Y-axis) */}
            {skillTree.map((category, index) => (
              <text
                key={category.category}
                x={-10}
                y={index * cellHeight + cellHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-sm font-medium fill-gray-700 dark:fill-gray-300"
              >
                {category.category}
              </text>
            ))}

            {/* Skill name labels (X-axis) */}
            {skillTree[0]?.skills.map((_, skillIndex) => {
              const x = skillIndex * cellWidth + cellWidth / 2;
              const skillNames = skillTree.map(cat => {
                const skill = cat.skills[skillIndex];
                return skill ? (skill.name.length > 15 ? skill.name.substring(0, 15) + '...' : skill.name) : null;
              }).filter(Boolean);
              const mostCommonName = skillNames[0] || `Skill ${skillIndex + 1}`;
              
              return (
                <text
                  key={skillIndex}
                  x={x}
                  y={-15}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  transform={`rotate(-45, ${x}, -15)`}
                >
                  {mostCommonName}
                </text>
              );
            })}
          </g>

          {/* Title */}
          <text
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="text-lg font-semibold fill-gray-800 dark:fill-gray-200"
          >
            Skill Progress Heatmap
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="text-gray-600">Progress:</div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4" style={{ backgroundColor: getColor(0, true) }}></div>
            <span className="text-xs">0%</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4" style={{ backgroundColor: getColor(0.5, true) }}></div>
            <span className="text-xs">50%</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4" style={{ backgroundColor: getColor(1, true) }}></div>
            <span className="text-xs">100%</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-gray-200 border"></div>
          <span className="text-xs">🔒 Locked</span>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div>
          <div className="text-2xl font-bold text-blue-600">
            {allSkills.filter(s => s.isUnlocked).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Unlocked Skills</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {allSkills.filter(s => s.progress === 1).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Mastered Skills</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(allSkills.reduce((acc, s) => acc + s.progress, 0) / allSkills.length * 100)}%
          </div>
          <div className="text-gray-600 dark:text-gray-400">Overall Progress</div>
        </div>
      </div>
    </div>
  );
}; 