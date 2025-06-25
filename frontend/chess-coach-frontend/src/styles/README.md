# Rookify Theme System

This document explains how to use the centralized theme system in the Rookify application.

## 📁 Files Overview

- **`theme.js`** - Main theme configuration with all colors, spacing, typography, etc.
- **`globals.css`** - CSS custom properties and global styles
- **`useTheme.js`** - React hooks for accessing theme in components
- **`README.md`** - This documentation file

## 🎨 Color Palette

The theme includes a comprehensive color system based on the Rookify brand:

### Primary Colors
- **Primary**: Deep blue (`#1E3A8A`) - Main brand color
- **Accent**: Warm gold (`#F59E0B`) - Call-to-action and highlights
- **Success**: Emerald (`#10B981`) - Success states and good moves
- **Warning**: Amber (`#F59E0B`) - Warnings and inaccuracies
- **Error**: Rose (`#F43F5E`) - Errors and blunders

### Chess-Specific Colors
- **Board**: Light/dark squares, highlights, and check indicators
- **Evaluation**: Colors for move quality (brilliant, great, good, mistake, blunder)

## 🚀 Usage Examples

### 1. Using Tailwind Classes (Recommended)

```jsx
// Primary button
<button className="bg-primary text-white hover:bg-primary-700 px-4 py-2 rounded-md">
  Analyze Game
</button>

// Chess move evaluation
<span className="text-evaluation-brilliant">Brilliant move!</span>
<span className="text-evaluation-blunder">Blunder</span>

// Cards and layouts
<div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 shadow-card">
  Content here
</div>
```

### 2. Using CSS Custom Properties

```css
/* In your CSS files */
.custom-button {
  background-color: var(--color-primary);
  color: white;
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition: background-color var(--duration-200) var(--ease-out);
}

.custom-button:hover {
  background-color: var(--color-primary-700);
}

/* Chess board styling */
.chess-square-light {
  background-color: var(--color-board-light);
}

.chess-square-dark {
  background-color: var(--color-board-dark);
}
```

### 3. Using React Hooks

```jsx
import { useTheme, useChessColors } from '../hooks/useTheme';

function GameAnalysisComponent() {
  const { colors, getMoveEvaluationColor, spacing } = useTheme();
  const { getAccuracyColor } = useChessColors();
  
  const moveAccuracy = 87;
  const moveEvaluation = 'good';
  
  return (
    <div style={{
      padding: spacing[4],
      backgroundColor: colors.neutral[50],
      borderRadius: spacing[2]
    }}>
      <span style={{ 
        color: getMoveEvaluationColor(moveEvaluation)
      }}>
        {moveEvaluation.toUpperCase()}
      </span>
      
      <div style={{
        backgroundColor: getAccuracyColor(moveAccuracy),
        padding: spacing[2],
        color: 'white'
      }}>
        Accuracy: {moveAccuracy}%
      </div>
    </div>
  );
}
```

### 4. Using Semantic Colors

```jsx
import { useTheme } from '../hooks/useTheme';

function TextComponent() {
  const { semanticColors } = useTheme();
  
  return (
    <div>
      <h1 style={{ color: semanticColors.text.primary }}>
        Main Heading
      </h1>
      <p style={{ color: semanticColors.text.secondary }}>
        Secondary text content
      </p>
      <a href="#" style={{ color: semanticColors.text.link }}>
        Link text
      </a>
    </div>
  );
}
```

## 🧩 Component Patterns

### Buttons

```jsx
// Primary button
<button className="btn btn-primary">
  Primary Action
</button>

// Secondary button  
<button className="btn btn-secondary">
  Secondary Action
</button>

// Accent button
<button className="btn btn-accent">
  Special Action
</button>
```

### Cards

```jsx
<div className="card">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-secondary">Card content goes here.</p>
</div>
```

### Chess Move Indicators

```jsx
// Using utility classes
<span className="move-brilliant">★ Brilliant!</span>
<span className="move-blunder">⚠ Blunder</span>

// Using hooks for dynamic content
function MoveEvaluation({ evaluation }) {
  const { getMoveEvaluationClass } = useTheme();
  
  return (
    <span className={getMoveEvaluationClass(evaluation)}>
      {evaluation}
    </span>
  );
}
```

## 🎯 Best Practices

### 1. Prefer Tailwind Classes
Use Tailwind utility classes when possible for consistency and performance:

```jsx
// ✅ Good
<div className="bg-primary text-white p-4 rounded-lg">

// ❌ Avoid when Tailwind class exists
<div style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '1rem' }}>
```

### 2. Use Semantic Colors
Use semantic color names for common UI patterns:

```jsx
// ✅ Good - semantic and flexible
<p className="text-secondary">

// ❌ Avoid - too specific
<p className="text-neutral-600">
```

### 3. Consistent Spacing
Use the spacing scale consistently:

```jsx
// ✅ Good - consistent scale
<div className="p-4 mb-6 gap-2">

// ❌ Avoid - arbitrary values
<div style={{ padding: '15px', marginBottom: '23px' }}>
```

### 4. Chess-Specific Colors
Use chess-specific colors for chess-related UI:

```jsx
// ✅ Good - semantic chess colors
<div className="bg-board-light border-board-dark">
<span className="text-evaluation-brilliant">

// ❌ Avoid - generic colors for chess elements
<div className="bg-yellow-200 border-brown-600">
```

## 🔧 Customization

### Adding New Colors

1. Add to `theme.js`:
```javascript
colors: {
  // ... existing colors
  custom: {
    purple: '#8B5CF6',
    orange: '#F97316',
  }
}
```

2. Update `tailwind.config.js`:
```javascript
extend: {
  colors: {
    // ... existing colors
    custom: theme.colors.custom,
  }
}
```

3. Add CSS variables to `globals.css`:
```css
:root {
  /* ... existing variables */
  --color-custom-purple: #8B5CF6;
  --color-custom-orange: #F97316;
}
```

### Responsive Design

Use responsive prefixes with Tailwind:

```jsx
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-xl md:text-2xl lg:text-3xl">
    Responsive heading
  </h1>
</div>
```

### Dark Mode (Future)

The theme is structured to support dark mode:

```css
/* Future dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: var(--color-neutral-900);
    --color-text-primary: var(--color-neutral-100);
    /* ... other dark mode overrides */
  }
}
```

## 🧪 Migration Guide

### Updating Existing Components

1. **Replace hardcoded colors** with theme colors:
```jsx
// Before
<div style={{ color: '#3182CE' }}>

// After  
<div className="text-primary">
```

2. **Use consistent spacing**:
```jsx
// Before
<div style={{ padding: '20px', margin: '15px' }}>

// After
<div className="p-5 m-4">
```

3. **Apply semantic classes**:
```jsx
// Before
<button style={{ backgroundColor: '#1E3A8A' }}>

// After
<button className="btn btn-primary">
```

## 📚 Reference

### Available Tailwind Classes

**Colors:**
- `bg-primary`, `text-primary`, `border-primary`
- `bg-accent`, `text-accent`, `border-accent`
- `bg-success`, `text-success`, `border-success`
- `bg-warning`, `text-warning`, `border-warning`
- `bg-error`, `text-error`, `border-error`
- `bg-neutral-{50-900}`, `text-neutral-{50-900}`

**Chess-specific:**
- `text-evaluation-{brilliant|great|good|inaccuracy|mistake|blunder}`
- `bg-board-{light|dark}`, `bg-evaluation-{type}`

**Typography:**
- `font-sans`, `font-display`, `font-mono`
- `text-{2xs|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl}`

**Spacing:**
- `p-{size}`, `m-{size}`, `gap-{size}` where size is 0-88
- `rounded-{none|sm|base|md|lg|xl|2xl|3xl|4xl|full}`

**Shadows:**
- `shadow-{sm|base|md|lg|xl|soft|card}`

This theme system ensures consistent branding and provides a scalable foundation for the Rookify application's visual design. 