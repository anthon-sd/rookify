import React from 'react';
import { useTheme, useChessColors } from '../../hooks/useTheme';

/**
 * ThemeExample Component
 * Demonstrates how to use the centralized theme system
 * This component can be used as a reference for other developers
 */
const ThemeExample = () => {
  const { colors, spacing, getMoveEvaluationColor, getMoveEvaluationClass } = useTheme();
  const { getAccuracyColor } = useChessColors();

  const sampleMoves = [
    { evaluation: 'brilliant', accuracy: 98 },
    { evaluation: 'great', accuracy: 92 },
    { evaluation: 'good', accuracy: 87 },
    { evaluation: 'inaccuracy', accuracy: 76 },
    { evaluation: 'mistake', accuracy: 65 },
    { evaluation: 'blunder', accuracy: 45 },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-display font-bold text-primary mb-2">
          Rookify Theme System
        </h1>
        <p className="text-secondary">
          Example components demonstrating the centralized theme usage
        </p>
      </div>

      {/* Color Palette Section */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">Color Palette</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-lg mx-auto mb-2"></div>
            <p className="text-sm font-mono">Primary</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-accent rounded-lg mx-auto mb-2"></div>
            <p className="text-sm font-mono">Accent</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-success rounded-lg mx-auto mb-2"></div>
            <p className="text-sm font-mono">Success</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-error rounded-lg mx-auto mb-2"></div>
            <p className="text-sm font-mono">Error</p>
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">Button Styles</h2>
        
        <div className="flex flex-wrap gap-4">
          <button className="btn btn-primary">
            Primary Button
          </button>
          <button className="btn btn-secondary">
            Secondary Button
          </button>
          <button className="btn btn-accent">
            Accent Button
          </button>
          <button className="bg-success text-white px-4 py-2 rounded-md hover:bg-success-600 transition-colors">
            Success Button
          </button>
        </div>
      </section>

      {/* Chess Move Evaluations */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">Chess Move Evaluations</h2>
        
        <div className="grid gap-3">
          {sampleMoves.map((move, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-3">
                {/* Using Tailwind utility classes */}
                <span className={`font-semibold capitalize ${getMoveEvaluationClass(move.evaluation)}`}>
                  {move.evaluation}
                </span>
                
                {/* Using inline styles with theme colors */}
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getMoveEvaluationColor(move.evaluation) }}
                ></div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-secondary">Accuracy:</span>
                <span 
                  className="font-semibold"
                  style={{ color: getAccuracyColor(move.accuracy) }}
                >
                  {move.accuracy}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chess Board Colors */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">Chess Board Colors</h2>
        
        <div className="grid grid-cols-4 gap-1 w-64 mx-auto">
          {Array.from({ length: 64 }, (_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isLight = (row + col) % 2 === 0;
            
            return (
              <div
                key={i}
                className={`aspect-square ${isLight ? 'bg-board-light' : 'bg-board-dark'} flex items-center justify-center`}
              >
                {i === 0 && <span className="text-xs">♜</span>}
                {i === 7 && <span className="text-xs">♜</span>}
                {i === 56 && <span className="text-xs">♖</span>}
                {i === 63 && <span className="text-xs">♖</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Typography Examples */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">Typography</h2>
        
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-primary">
              Heading 1 - Display Font
            </h1>
            <p className="text-secondary">Using font-display class (Poppins)</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-sans font-semibold">
              Heading 2 - Sans Font
            </h2>
            <p className="text-secondary">Using font-sans class (Inter)</p>
          </div>
          
          <div>
            <code className="text-sm font-mono bg-neutral-100 px-2 py-1 rounded">
              Monospace font for code
            </code>
            <p className="text-secondary">Using font-mono class (JetBrains Mono)</p>
          </div>
        </div>
      </section>

      {/* Spacing Examples */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">Spacing Scale</h2>
        
        <div className="space-y-3">
          {[1, 2, 3, 4, 6, 8, 12, 16].map(size => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-16 text-sm font-mono">spacing-{size}</span>
              <div 
                className="bg-accent rounded"
                style={{ 
                  width: spacing[size], 
                  height: spacing[size],
                  minWidth: spacing[size],
                  minHeight: spacing[size]
                }}
              ></div>
              <span className="text-sm text-secondary">{spacing[size]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CSS Variables Example */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">CSS Variables Usage</h2>
        
        <div className="space-y-4">
          <div 
            className="p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--color-primary-50)',
              border: '2px solid var(--color-primary-200)',
              color: 'var(--color-primary-800)'
            }}
          >
            This box uses CSS custom properties directly
          </div>
          
          <div className="bg-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
            <pre>{`style={{
  backgroundColor: 'var(--color-primary-50)',
  border: '2px solid var(--color-primary-200)',
  color: 'var(--color-primary-800)'
}}`}</pre>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="card">
        <h2 className="text-2xl font-display font-semibold mb-4">Usage Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Using Tailwind Classes (Recommended)</h3>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
              <pre>{`<button className="bg-primary text-white hover:bg-primary-700 px-4 py-2 rounded-md">
  Analyze Game
</button>`}</pre>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">2. Using Theme Hook</h3>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
              <pre>{`const { getMoveEvaluationColor } = useTheme();
const color = getMoveEvaluationColor('brilliant');`}</pre>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">3. Using CSS Variables</h3>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
              <pre>{`.custom-style {
  background-color: var(--color-primary);
  padding: var(--spacing-4);
  border-radius: var(--radius-md);
}`}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ThemeExample; 