# Message Fatigue Calculator - Design Guidelines

## Overview
This document outlines the design system and guidelines for the Message Fatigue Calculator, inspired by Customer.io's brand aesthetic and modern design principles.

## Brand Colors

### Primary Colors
- **Indigo/Lavender**: `#667eea` → `#764ba2` (Primary gradient)
- **Coral/Pink**: `#ff7675` → `#fd79a8` (Warning/Alert gradient)

### Secondary Colors
- **Evergreen**: `#0B353B` (Dark teal for accents)
- **Verdant**: `#E4FFCE` (Light green for success states)
- **Arctic**: Light blue/cyan for information
- **Cosmic**: Orange/yellow for highlights

### Neutral Colors
- **Charcoal**: `#2C2C2C` (Dark text, headers)
- **Warm Gray 200**: `#CFCFCE` (Borders, dividers)
- **Warm Gray 100**: `#E9E9E8` (Light backgrounds)
- **White**: `#FFFFFF` (Primary background)

## Typography

### Font Family
- **Primary**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`
- **Fallback**: System font stack for maximum compatibility

### Type Scale
- **XXL Title**: 3rem (48px) - Main hero headings
- **XL Title**: 2.5rem (40px) - Section headings
- **H1**: 2rem (32px) - Page titles
- **H2**: 1.5rem (24px) - Card titles
- **H3**: 1.25rem (20px) - Subsection titles
- **Body Large**: 1.125rem (18px) - Important body text
- **Body**: 1rem (16px) - Standard body text
- **Small**: 0.875rem (14px) - Captions, metadata
- **Eyebrow**: 0.75rem (12px) - Labels, tags

### Font Weights
- **Light**: 300 (Rarely used)
- **Regular**: 400 (Body text)
- **Medium**: 500 (Emphasis)
- **Semi-bold**: 600 (Headings, buttons)
- **Bold**: 700 (Strong emphasis)

## Layout & Spacing

### Grid System
- **Container Max-width**: 1200px
- **Gutter**: 20px
- **Column Gap**: 30px for large layouts, 20px for mobile

### Spacing Scale (8px base unit)
- **4px**: Micro spacing (button padding)
- **8px**: Small spacing (icon gaps)
- **12px**: Medium spacing (text spacing)
- **16px**: Default spacing (card padding)
- **20px**: Large spacing (section gaps)
- **24px**: XL spacing (component margins)
- **32px**: XXL spacing (major sections)
- **40px**: XXXL spacing (page sections)

### Border Radius
- **Small**: 4px (Small buttons, inputs)
- **Medium**: 8px (Cards, containers)
- **Large**: 12px (Main cards)
- **XL**: 16px (Toggle buttons)
- **Round**: 50% (Circular elements)

## Component Design

### Cards
```css
background: linear-gradient(135deg, #667eea, #764ba2);
border-radius: 12px;
padding: 25px;
box-shadow: 0 4px 6px rgba(0,0,0,0.1);
```

#### Primary Card (Featured)
- Enhanced border: `2px solid rgba(255, 255, 255, 0.3)`
- Elevated shadow: `0 6px 12px rgba(102, 126, 234, 0.3)`
- Subtle scale: `transform: scale(1.02)`

#### Warning Card
```css
background: linear-gradient(135deg, #ff7675, #fd79a8);
```

### Buttons

#### Toggle Buttons
- **Background**: `transparent` → `rgba(255, 255, 255, 0.25)` (active)
- **Border**: None
- **Padding**: `6px 12px`
- **Border Radius**: 16px
- **Font Size**: 0.75rem
- **Font Weight**: 500 → 600 (active)
- **Opacity**: 0.7 → 1.0 (active)

#### Primary Buttons
- **Background**: `#667eea`
- **Hover**: `#5a6fd8`
- **Padding**: `12px 24px`
- **Border Radius**: 8px
- **Font Weight**: 500

### Tables
- **Header Background**: `#667eea`
- **Header Text**: White, 600 weight
- **Row Hover**: `#f8f9fa`
- **Border**: `1px solid #e9ecef`
- **Cell Padding**: `12px 15px`

### Forms
- **Input Border**: `1px solid #ddd`
- **Input Focus**: `border-color: #667eea`
- **Input Padding**: `8px 12px`
- **Input Border Radius**: 6px

## Interaction Design

### Hover States
- **Cards**: Subtle lift with `transform: translateY(-2px)`
- **Buttons**: Background color change + `transform: translateY(-2px)`
- **Tables**: Row background change to `#f8f9fa`

### Transitions
- **Standard**: `all 0.3s ease`
- **Fast**: `all 0.2s ease`
- **Slow**: `all 0.5s ease`

### Active States
- **Buttons**: Pressed appearance with `transform: translateY(0)`
- **Toggle Buttons**: Enhanced background and shadow

## Color Usage Guidelines

### Semantic Colors
- **Success**: Verdant green family
- **Warning**: Cosmic orange/yellow family
- **Error**: Coral/pink family
- **Info**: Arctic blue family
- **Neutral**: Warm gray family

### Accessibility
- **Minimum Contrast**: 4.5:1 for normal text
- **Enhanced Contrast**: 7:1 for small text
- **Color Blindness**: Never rely on color alone for meaning

## Responsive Design

### Breakpoints
- **Mobile**: < 480px
- **Tablet**: 480px - 768px
- **Desktop**: 768px - 1200px
- **Large Desktop**: > 1200px

### Mobile Adaptations
- **Font Sizes**: Reduce by 10-20%
- **Padding**: Reduce by 20-25%
- **Button Size**: Minimum 44px touch target
- **Spacing**: Compress spacing scale by 25%

## Micro-interactions

### Loading States
- **Spinner**: White on colored backgrounds
- **Opacity**: Fade in/out at 0.7 opacity
- **Duration**: 1s rotation for spinners

### Success Feedback
- **Color**: Verdant green
- **Animation**: Subtle fade-in
- **Duration**: 3-5 seconds display time

### Error Feedback
- **Color**: Coral/pink
- **Animation**: Gentle shake or pulse
- **Persistence**: Until user action

## Data Visualization

### Chart Colors
- **Primary**: `#667eea` (Main data series)
- **Secondary**: `#26de81` (Comparison data)
- **Accent**: `#45aaf2` (Additional data)
- **Warning**: `#ffa502` (Alerts in data)

### Chart Styling
- **Grid Lines**: `rgba(0,0,0,0.1)`
- **Axis Labels**: Charcoal, 0.875rem
- **Tooltips**: White background, subtle shadow

## Content Guidelines

### Voice & Tone
- **Professional** yet **approachable**
- **Clear** and **concise** language
- **Helpful** error messages
- **Encouraging** success messages

### Iconography
- **Style**: Outlined, consistent stroke width
- **Size**: 16px, 20px, 24px standard sizes
- **Color**: Inherit from parent or neutral gray

## Implementation Notes

### CSS Variables
```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea, #764ba2);
  --warning-gradient: linear-gradient(135deg, #ff7675, #fd79a8);
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 6px 12px rgba(0,0,0,0.15);
}
```

### Performance Considerations
- **Gradients**: Use sparingly for performance
- **Shadows**: Limit complex shadows on mobile
- **Animations**: Respect `prefers-reduced-motion`
- **Images**: Optimize for retina displays

## Brand Alignment

### Customer.io Inspired Elements
- **Purple/indigo gradients** for primary branding
- **Modern sans-serif typography** (Instrument Sans inspired)
- **Clean, minimal layouts** with generous whitespace
- **Subtle shadows and depth** for visual hierarchy
- **Professional color palette** suitable for B2B tools

### Privacy-First Messaging
- **Prominent privacy badges** and callouts
- **Clear data handling** explanations
- **Trust indicators** throughout the interface
- **Local processing** emphasized in design

---

*Last updated: January 2025*
*Version: 1.0*
